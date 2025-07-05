import React, { useState, useEffect, createContext, useContext } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- Firebase Configuration ---
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIbqm25xhm7XkJoYaNV7_ElZQieyhjTUo",
  authDomain: "statuscheckapp-5dd35.firebaseapp.com",
  projectId: "statuscheckapp-5dd35",
  storageBucket: "statuscheckapp-5dd35.appspot.com",
  messagingSenderId: "970974477449",
  appId: "1:970974477449:web:67b011b1e1a21a62429a58",
};

// --- Firebase Initialization (Compat Mode) ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// --- Mock API for Quotes ---
const mockAPI = {
    getMotivationalQuote: async () => {
        const quotes = [
            "The sun is a daily reminder that we too can rise again from the darkness, that we too can shine our own light.",
            "You are not a drop in the ocean. You are the entire ocean in a drop.",
            "It's okay not to be okay. It's a part of being human.",
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }
};

// --- React Context for Auth and DB ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Effect for handling authentication state changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    // Effect for fetching user data when user object changes
    useEffect(() => {
        if (user) {
            const userDocRef = db.collection('users').doc(user.uid);
            const unsubscribeSnapshot = userDocRef.onSnapshot(docSnap => {
                if (docSnap.exists) {
                    setUserData(docSnap.data());
                } else {
                    setUserData(null);
                }
            });
            return () => unsubscribeSnapshot();
        } else {
            setUserData(null);
        }
    }, [user]);

    const value = { user, userData, loading, auth, db };

    return (
        <FirebaseContext.Provider value={value}>
            {!loading && children}
        </FirebaseContext.Provider>
    );
};

const useFirebase = () => {
    return useContext(FirebaseContext);
};

// --- Main App Component ---
function App() {
  const { user, loading } = useFirebase();

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {user ? <AppShell /> : <AuthScreen />}
    </div>
  );
}

// --- Screens ---

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        setError(err.message);
      }
    } else {
      if (!username) {
          setError("Please enter a username.");
          setLoading(false);
          return;
      }
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        // Create user document
        await db.collection('users').doc(newUser.uid).set({
          uid: newUser.uid,
          email: newUser.email,
          username: username,
          status: 'Feeling Good',
          isAmbassador: false,
          isPremium: false,
        });
        // Create their support circle document
        await db.collection('supportCircles').doc(newUser.uid).set({ members: [] });
      } catch (err) {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <h1 style={styles.title}>Status Check</h1>
      <form onSubmit={handleAuth} style={styles.form}>
        {!isLogin && (
          <input
            type="text"
            style={styles.input}
            placeholder="Choose a unique username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
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
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? '...' : (isLogin ? 'Log In' : 'Sign Up')}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
        {isLogin ? 'Need an account? Sign Up' : 'Have an account? Log In'}
      </button>
    </div>
  );
}

// --- App Shell for Logged-In Users ---
function AppShell() {
    const [currentPage, setCurrentPage] = useState('Home');

    const renderPage = () => {
        switch (currentPage) {
            case 'Home':
                return <HomeScreen />;
            case 'My Circle':
                return <SupportCircleScreen />;
            case 'Journal':
                return <JournalScreen />;
            case 'Resources':
                return <ResourcesScreen />;
            case 'Profile':
                return <ProfileScreen />;
            default:
                return <HomeScreen />;
        }
    }

    return (
        <div style={styles.appShell}>
            <div style={styles.pageContent}>
                {renderPage()}
            </div>
            <BottomNavBar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
    )
}

// --- Screens for Logged-In State ---
function HomeScreen() {
    const { userData } = useFirebase();
    const [quote, setQuote] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [alertType, setAlertType] = useState('');

    useEffect(() => {
        mockAPI.getMotivationalQuote().then(setQuote);
    }, []);

    const handleAlertClick = (type) => {
        setAlertType(type);
        setShowModal(true);
    };

    const confirmAlert = () => {
        console.log(`${alertType} alert sent!`);
        window.alert(`${alertType} alert has been sent to your Support Circle.`);
        setShowModal(false);
    };

    return (
        <div style={{textAlign: 'center'}}>
            {showModal && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.header}>Confirm Alert</h2>
                        <p style={styles.subtitle}>Are you sure you want to send a {alertType} alert?</p>
                        <div style={{display: 'flex', justifyContent: 'space-around', width: '100%'}}>
                            <button onClick={() => setShowModal(false)} style={{...styles.button, backgroundColor: '#555'}}>Cancel</button>
                            <button onClick={confirmAlert} style={{...styles.button, backgroundColor: '#dc2626'}}>Yes, Send</button>
                        </div>
                    </div>
                </div>
            )}

            <h1 style={styles.header}>Welcome, {userData?.username || 'User'}!</h1>
            <p style={{...styles.subtitle, fontStyle: 'italic', marginBottom: '48px'}}>"{quote}"</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <button onClick={() => handleAlertClick('Crisis')} style={{...styles.button, ...styles.crisisButton}}>
                    CRISIS ALERT
                </button>
                <button onClick={() => handleAlertClick('Support Request')} style={{...styles.button, ...styles.supportButton}}>
                    Support Request
                </button>
            </div>
        </div>
    )
}

function SupportCircleScreen() {
    const { user, db } = useFirebase();
    const [friendId, setFriendId] = useState('');
    const [circleMembers, setCircleMembers] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!user) return;
        const circleDocRef = db.collection('supportCircles').doc(user.uid);

        const unsubscribe = circleDocRef.onSnapshot(async (docSnap) => {
            if (docSnap.exists) {
                const memberUids = docSnap.data().members;
                if (memberUids && memberUids.length > 0) {
                    const usersRef = db.collection('users');
                    const memberPromises = memberUids.map(uid => usersRef.doc(uid).get());
                    const memberDocs = await Promise.all(memberPromises);
                    const membersData = memberDocs.map(doc => doc.data());
                    setCircleMembers(membersData);
                } else {
                    setCircleMembers([]);
                }
            }
        });

        return () => unsubscribe();
    }, [user, db]);

    const handleAddFriend = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!friendId.trim()) { setError("Please enter a User ID."); return; }
        if (friendId === user.uid) { setError("You cannot add yourself to your circle."); return; }

        try {
            const friendDocRef = db.collection('users').doc(friendId);
            const friendDoc = await friendDocRef.get();

            if (!friendDoc.exists) { setError("User ID not found."); return; }

            const circleDocRef = db.collection('supportCircles').doc(user.uid);
            await circleDocRef.set({ 
                members: firebase.firestore.FieldValue.arrayUnion(friendId) 
            }, { merge: true }); // Use set with merge to create if it doesn't exist

            setSuccess(`Added friend to your circle!`);
            setFriendId('');
        } catch (err) {
            setError("Could not add friend. Please try again.");
            console.error(err);
        }
    };

    const handleRemoveFriend = async (uidToRemove) => {
        try {
            const circleDocRef = db.collection('supportCircles').doc(user.uid);
            await circleDocRef.update({ 
                members: firebase.firestore.FieldValue.arrayRemove(uidToRemove) 
            });
            setSuccess('Friend removed from your circle.');
        } catch (err) {
            setError("Could not remove friend. Please try again.");
            console.error(err);
        }
    };

    return (
        <div>
            <h1 style={styles.header}>My Circle</h1>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Add a Friend</h2>
                <p style={styles.label}>Your User ID (share this with friends):</p>
                <p style={styles.userIdText}>{user?.uid}</p>
                <form onSubmit={handleAddFriend} style={styles.form}>
                    <input type="text" style={styles.input} placeholder="Enter friend's User ID" value={friendId} onChange={(e) => setFriendId(e.target.value)} />
                    <button type="submit" style={styles.button}>Add Friend</button>
                    {error && <p style={styles.errorText}>{error}</p>}
                    {success && <p style={styles.successText}>{success}</p>}
                </form>
            </div>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Circle Members</h2>
                {circleMembers.length > 0 ? (
                    circleMembers.map(member => (
                        <div key={member.uid} style={styles.memberItem}>
                            <div>
                                <p style={styles.memberName}>{member.username}</p>
                                <p style={{...styles.memberStatus, color: member.status === 'Feeling Good' ? '#4ade80' : member.status === 'Struggling' ? '#f87171' : '#facc15' }}>{member.status}</p>
                            </div>
                            <button onClick={() => handleRemoveFriend(member.uid)} style={styles.removeButton}>Remove</button>
                        </div>
                    ))
                ) : (
                    <p style={styles.subtitle}>Your circle is empty.</p>
                )}
            </div>
        </div>
    );
}

function JournalScreen() {
    const { user, db } = useFirebase();
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');

    useEffect(() => {
        if (!user) return;

        const journalCollectionRef = db.collection('users').doc(user.uid).collection('journal').orderBy('createdAt', 'desc');
        const unsubscribe = journalCollectionRef.onSnapshot(snapshot => {
            const entriesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEntries(entriesData);
        });

        return () => unsubscribe();
    }, [user, db]);

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!newEntry.trim() || !user) return;
        try {
            await db.collection('users').doc(user.uid).collection('journal').add({
                text: newEntry,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setNewEntry('');
        } catch(err) {
            console.error("Error adding journal entry:", err);
            alert("Could not save your entry. Please try again.");
        }
    };

    return (
        <div>
            <h1 style={styles.header}>My Journal</h1>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>New Entry</h2>
                <form onSubmit={handleAddEntry}>
                    <textarea 
                        style={{...styles.input, height: '100px', resize: 'vertical'}}
                        placeholder="How are you feeling today?"
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                    />
                    <button type="submit" style={styles.button}>Save Entry</button>
                </form>
            </div>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Recent Entries</h2>
                {entries.length > 0 ? (
                    entries.map(entry => (
                        <div key={entry.id} style={styles.journalEntry}>
                            <p style={styles.journalText}>{entry.text}</p>
                            <p style={styles.journalDate}>
                                {entry.createdAt ? new Date(entry.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </p>
                        </div>
                    ))
                ) : (
                    <p style={styles.subtitle}>No journal entries yet.</p>
                )}
            </div>
        </div>
    );
}

function ResourcesScreen() {
    return <div><h1 style={styles.header}>Resources</h1></div>
}

function ProfileScreen() {
    const { auth, user, userData, db } = useFirebase();
    const [success, setSuccess] = useState('');

    const handleStatusUpdate = async (newStatus) => {
        if (!user) return;
        try {
            const userDocRef = db.collection('users').doc(user.uid);
            await userDocRef.set({ status: newStatus }, { merge: true });
            setSuccess(`Your status has been updated to "${newStatus}"`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Could not update your status. Please try again.");
        }
    };

    const handleAmbassadorToggle = async (e) => {
        if (!user) return;
        try {
            const isAmbassador = e.target.checked;
            const userDocRef = db.collection('users').doc(user.uid);
            await userDocRef.set({ isAmbassador }, { merge: true });
            setSuccess(`Ambassador status ${isAmbassador ? 'enabled' : 'disabled'}.`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Error updating ambassador status:", err);
            alert("Could not update your ambassador status. Please try again.");
        }
    };

    return (
        <div>
            <h1 style={styles.header}>Profile</h1>
            {success && <p style={styles.successText}>{success}</p>}
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>My Details</h2>
                <p style={styles.label}>Username: {userData?.username}</p>
                <p style={styles.label}>Email: {userData?.email}</p>
            </div>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Set Your Daily Status</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <button onClick={() => handleStatusUpdate('Feeling Good')} style={{...styles.button, backgroundColor: '#22c55e'}}>Feeling Good</button>
                    <button onClick={() => handleStatusUpdate('Uneasy')} style={{...styles.button, backgroundColor: '#f59e0b'}}>Uneasy</button>
                    <button onClick={() => handleStatusUpdate('Struggling')} style={{...styles.button, backgroundColor: '#ef4444'}}>Struggling</button>
                </div>
            </div>
             <div style={styles.card}>
                <h2 style={styles.cardTitle}>Ambassador Program</h2>
                <label style={styles.toggleContainer}>
                    <p style={{...styles.label, marginBottom: 0}}>Become an Ambassador</p>
                    <input type="checkbox" checked={userData?.isAmbassador || false} onChange={handleAmbassadorToggle} />
                </label>
            </div>
            <button onClick={() => auth.signOut()} style={{...styles.button, backgroundColor: '#6b7280'}}>
                Log Out
            </button>
        </div>
    )
}


// --- Navigation ---
function BottomNavBar({ currentPage, setCurrentPage }) {
    const navItems = ['Home', 'My Circle', 'Journal', 'Resources', 'Profile'];
    return (
        <div style={styles.navBar}>
            {navItems.map(item => (
                <button 
                    key={item} 
                    onClick={() => setCurrentPage(item)} 
                    style={{...styles.navItem, color: currentPage === item ? '#22d3ee' : '#d1d5db', borderTop: currentPage === item ? '2px solid #22d3ee' : 'none'}}
                >
                    {item}
                </button>
            ))}
        </div>
    )
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
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    backgroundColor: '#374151',
    color: '#f9fafb',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    marginBottom: '16px',
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
  },
  crisisButton: {
      backgroundColor: '#b91c1c', // Red-700
      paddingTop: '24px',
      paddingBottom: '24px',
      fontSize: '20px',
  },
  supportButton: {
      backgroundColor: '#f59e0b', // Amber-500
      color: '#000'
  },
  toggleButton: {
    backgroundColor: 'transparent',
    color: '#22d3ee',
    border: 'none',
    marginTop: '16px',
    cursor: 'pointer',
    textAlign: 'center',
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: '16px',
  },
  successText: {
      color: '#4ade80',
      textAlign: 'center',
      margin: '16px 0',
  },
  appShell: {
    backgroundColor: '#1f2937', // Darker background for the app
    color: '#f9fafb',
    width: '100%',
    height: '100%',
    maxWidth: '420px', // Mobile-like width
    maxHeight: '800px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  pageContent: {
      flexGrow: 1,
      padding: '24px',
      overflowY: 'auto',
      backgroundColor: '#111827', // Even darker for the content area
  },
  header: {
    color: '#22d3ee',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  navBar: {
      display: 'flex',
      flexDirection: 'row',
      borderTop: '1px solid #374151',
      backgroundColor: '#1f2937',
  },
  navItem: {
      flex: 1,
      padding: '12px',
      textAlign: 'center',
      color: '#d1d5db',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px'
  },
  modalBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
  },
  modalContent: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '400px',
      textAlign: 'center',
  },
  card: {
      backgroundColor: '#1f2937',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
  },
  cardTitle: {
      color: '#fff',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '16px',
  },
  label: {
      color: '#d1d5db',
      marginBottom: '8px',
  },
  userIdText: {
      backgroundColor: '#374151',
      color: '#f9fafb',
      padding: '8px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      textAlign: 'center',
      marginBottom: '16px',
      wordBreak: 'break-all',
  },
  memberItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px',
      borderBottom: '1px solid #374151',
  },
  memberName: {
      color: '#f9fafb',
      fontSize: '16px',
  },
  memberStatus: {
      fontSize: '12px',
  },
  removeButton: {
      backgroundColor: '#b91c1c',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      cursor: 'pointer',
  },
  toggleContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
  },
  journalEntry: {
      backgroundColor: '#374151',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '8px',
  },
  journalText: {
      color: '#f9fafb',
  },
  journalDate: {
      color: '#9ca3af',
      fontSize: '10px',
      textAlign: 'right',
      marginTop: '8px',
  },
  resourceItem: {
      display: 'block',
      backgroundColor: '#374151',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '12px',
      textDecoration: 'none',
  },
  resourceName: {
      color: '#f9fafb',
      fontWeight: 'bold',
  },
  resourceContact: {
      color: '#22d3ee',
      marginTop: '4px',
  },
  premiumUpsell: {
      textAlign: 'center',
      padding: '24px',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      border: '1px dashed #9333ea',
      borderRadius: '8px',
  }
};

// --- Root Component for Replit ---
export default function Main() {
    return (
        <FirebaseProvider>
            <App />
        </FirebaseProvider>
    )
}