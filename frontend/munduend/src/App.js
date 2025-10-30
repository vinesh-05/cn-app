import { useState } from 'react';
import './index.css'; // We'll use this for styling

// --- CONFIGURATION ---
// Make sure this matches the address of your running FastAPI server
const API_URL = 'http://localhost:8000';
// ---------------------

function App() {
  const [status, setStatus] = useState('idle'); // idle, testing, complete
  const [latency, setLatency] = useState(null);
  const [jitter, setJitter] = useState(null);
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);

  /**
   * 1. Measures Latency and Jitter
   */
  const measureLatency = () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws`);
      const pings = [];
      let counter = 0;
      const NUM_PINGS = 10;

      ws.onopen = () => {
        const sendPing = () => {
          if (counter >= NUM_PINGS) {
            ws.close();
            
            // Calculate results
            const avgLatency = pings.reduce((a, b) => a + b, 0) / pings.length;
            const variance = pings.map((l) => Math.pow(l - avgLatency, 2)).reduce((a, b) => a + b, 0) / pings.length;
            const stdDeviation = Math.sqrt(variance); // This is the Jitter

            resolve({ latency: avgLatency, jitter: stdDeviation });
            return;
          }

          ws.send(Date.now().toString());
          counter++;
        };
        
        ws.onmessage = (event) => {
          const roundTripTime = Date.now() - parseInt(event.data, 10);
          pings.push(roundTripTime);
          setTimeout(sendPing, 100); // Wait 100ms before next ping
        };
        
        sendPing(); // Send the first ping
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        reject(new Error("WebSocket connection failed. Is the server running?"));
      };
    });
  };

  /**
   * 2. Measures Download Speed
   */
  const measureDownload = async () => {
    try {
      const startTime = performance.now();
      // Add a random query string to prevent caching
      const response = await fetch(`${API_URL}/download?t=${Date.now()}`);
      const blob = await response.blob();
      const endTime = performance.now();

      const durationInSeconds = (endTime - startTime) / 1000;
      const sizeInBits = blob.size * 8;
      const speedMbps = (sizeInBits / durationInSeconds) / 1_000_000;
      
      return speedMbps;
    } catch (e) {
      console.error("Download test failed:", e);
      return null;
    }
  };

  /**
   * 3. Measures Upload Speed
   */
  const measureUpload = async () => {
    try {
      // Create a 10MB blob of random data in the browser
      const data = new Blob([new ArrayBuffer(1024 * 1024 * 10)], { type: 'application/octet-stream' });

      const startTime = performance.now();
      await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: data,
      });
      const endTime = performance.now();

      const durationInSeconds = (endTime - startTime) / 1000;
      const sizeInBits = data.size * 8;
      const speedMbps = (sizeInBits / durationInSeconds) / 1_000_000;
      
      return speedMbps;
    } catch (e) {
      console.error("Upload test failed:", e);
      return null;
    }
  };

  /**
   * 4. Runs all tests in sequence
   */
  const runTest = async () => {
    setStatus('testing');
    
    // Reset all values
    setLatency(null);
    setJitter(null);
    setDownloadSpeed(null);
    setUploadSpeed(null);

    try {
      // Test 1: Latency & Jitter
      const { latency, jitter } = await measureLatency();
      setLatency(latency);
      setJitter(jitter);

      // Test 2: Download
      const dlSpeed = await measureDownload();
      setDownloadSpeed(dlSpeed);
      
      // Test 3: Upload
      const ulSpeed = await measureUpload();
      setUploadSpeed(ulSpeed);

      setStatus('complete');
    } catch (error) {
      alert(`Test Failed: ${error.message}`);
      setStatus('idle');
    }
  };

  // Helper to display a result
  const ResultItem = ({ label, value, unit }) => {
    let displayValue;
    if (status === 'testing' && value === null) {
      displayValue = <span className="loading-text">testing...</span>;
    } else if (value !== null) {
      displayValue = `${value.toFixed(2)} ${unit}`;
    } else {
      displayValue = '-';
    }

    return (
      <div className="result-item">
        <strong>{label}:</strong>
        <span>{displayValue}</span>
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Network Performance Test</h1>
      <p>Test your connection's speed and latency.</p>

      <div className="button-container">
        <button onClick={runTest} disabled={status === 'testing'}>
          {status === 'testing' ? 'Testing...' : 'Start Test'}
        </button>
      </div>

      <div className="results">
        <ResultItem label="Latency" value={latency} unit="ms" />
        <ResultItem label="Jitter" value={jitter} unit="ms" />
        <ResultItem label="Download" value={downloadSpeed} unit="Mbps" />
        <ResultItem label="Upload" value={uploadSpeed} unit="Mbps" />
      </div>
    </div>
  );
}

export default App;