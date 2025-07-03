import React, { useState, useEffect, createContext, useContext } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCIbqm25xhm7XkJoYaNV7_ElZQieyhjTUo",
  authDomain: "statuscheckapp-5dd35.firebaseapp.com",
  projectId: "statuscheckapp-5dd35",
  storageBucket: "statuscheckapp-5dd35.appspot.com",
  messagingSenderId: "970974477449",
  appId: "1:970974477449:web:67b011b1e1a21a62429a58",
};

// --- Firebase Initialization ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// --- Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = { user, loading, auth, db };
    return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

const useFirebase = () => useContext(FirebaseContext);

// --- Main App ---
export default function App() {
    return (
        <FirebaseProvider>
            <MainApp />
        </FirebaseProvider>
    );
}

function MainApp() {
  const { user, loading } = useFirebase();

  if (loading) {
    return <div style={styles.container}><p style={styles.loadingText}>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      {user ? <LoggedInScreen /> : <AuthScreen />}
    </div>
  );
}

// --- Screens ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (action) => {
    setError('');
    try {
      if (action === 'login') {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        await auth.createUserWithEmailAndPassword(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.authContainer}>
      <h1 style={styles.title}>Status Check</h1>
      <input
        type="email"
        style={styles.input}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        style={styles.input}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p style={styles.errorText}>{error}</p>}
      <button onClick={() => handleAuth('login')} style={styles.button}>Log In</button>
      <button onClick={() => handleAuth('signup')} style={{...styles.button, ...styles.signupButton}}>Sign Up</button>
    </div>
  );
}

function LoggedInScreen() {
  const { user, auth } = useFirebase();
  return (
    <div style={styles.loggedInContainer}>
      <h1 style={styles.title}>Welcome!</h1>
      <p style={styles.subtitle}>Logged in as: {user.email}</p>
      <button onClick={() => auth.signOut()} style={styles.button}>Log Out</button>
    </div>
  );
}

// --- Styles ---
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#111827',
    fontFamily: 'sans-serif',
  },
  loadingText: {
    color: '#fff',
    fontSize: '18px',
  },
  authContainer: {
    backgroundColor: '#1f2937',
    padding: '40px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '400px',
  },
  loggedInContainer: {
    textAlign: 'center',
  },
  title: {
    color: '#22d3ee',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '24px',
  },
  subtitle: {
    color: '#d1d5db',
    fontSize: '16px',
    textAlign: 'center',
    marginBottom: '24px',
  },
  input: {
    backgroundColor: '#374151',
    color: '#f9fafb',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    marginBottom: '16px',
    width: 'calc(100% - 32px)',
  },
  button: {
    backgroundColor: '#0891b2',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '12px',
  },
  signupButton: {
      backgroundColor: '#52525b',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: '16px',
  },
};