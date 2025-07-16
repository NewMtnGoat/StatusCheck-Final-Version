import React from 'react';
import ReactDOM from 'react-dom/client';
import Main from './App.jsx';
import './index.css'; // This line is important here

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
)