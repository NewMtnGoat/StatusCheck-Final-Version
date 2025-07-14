import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
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

// --- Mock API for username suggestions ---
const suggestUsernames = (baseUsername) => {
    return [
        `${baseUsername}${Math.floor(Math.random() * 100)}`,
        `${baseUsername}_${Math.floor(Math.random() * 10)}`,
        `The${baseUsername}`,
    ];
};

// --- React Context for Auth and DB ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = db.collection('users').doc(user.uid);
                const unsubscribeSnapshot = userDocRef.onSnapshot(docSnap => {
                    setUserData(docSnap.exists ? docSnap.data() : null);
                });
                setUser(user);
                return () => unsubscribeSnapshot();
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

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
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('');
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (isLogin || useEmailAsUsername || !username) {
          setUsernameStatus('');
          setSuggestedUsernames([]);
          return;
      }

      setUsernameStatus('checking');
      const debouncedCheck = setTimeout(async () => {
          const usersRef = db.collection('users');
          const querySnapshot = await usersRef.where('username', '==', username).get();
          if (querySnapshot.empty) {
              setUsernameStatus('available');
              setSuggestedUsernames([]);
          } else {
              setUsernameStatus('taken');
              setSuggestedUsernames(suggestUsernames(username));
          }
      }, 500);

      return () => clearTimeout(debouncedCheck);
  }, [username, isLogin, useEmailAsUsername]);

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
      const finalUsername = useEmailAsUsername ? email : username;
      if (!finalUsername || (!useEmailAsUsername && usernameStatus !== 'available')) {
          setError("Please provide a valid email and an available username.");
          setLoading(false);
          return;
      }
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        await db.collection('users').doc(newUser.uid).set({
          uid: newUser.uid,
          email: newUser.email,
          username: finalUsername,
          isAmbassador: false,
          bio: "This user hasn't written a bio yet."
        });
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
          <>
            <div style={{marginBottom: '16px'}}>
                <label style={styles.toggleContainer}>
                    <input type="checkbox" checked={useEmailAsUsername} onChange={(e) => setUseEmailAsUsername(e.target.checked)} />
                    <span style={{...styles.label, marginBottom: 0, marginLeft: '8px'}}>Use email as username</span>
                </label>
            </div>
            {!useEmailAsUsername && (
                 <div>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Choose a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    {usernameStatus === 'checking' && <p style={{...styles.usernameStatus, color: '#f59e0b'}}>Checking...</p>}
                    {usernameStatus === 'available' && <p style={{...styles.usernameStatus, color: '#4ade80'}}>Username is available!</p>}
                    {usernameStatus === 'taken' && <p style={{...styles.usernameStatus, color: '#ef4444'}}>Username is taken.</p>}
                    {usernameStatus === 'taken' && suggestedUsernames.length > 0 && (
                        <div style={styles.suggestionsContainer}>
                            <p style={{margin: 0, fontSize: '12px'}}>Suggestions:</p>
                            {suggestedUsernames.map(name => (
                                <button key={name} type="button" onClick={() => setUsername(name)} style={styles.suggestionButton}>{name}</button>
                            ))}
                        </div>
                    )}
                  </div>
            )}
          </>
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
        <button type="submit" style={styles.button} disabled={loading || (!isLogin && !useEmailAsUsername && usernameStatus !== 'available')}>
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
            case 'Suggestions':
                return <SuggestionBoxScreen />;
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
    const [showModal, setShowModal] = useState(false);
    const [alertType, setAlertType] = useState('');

    const handleAlertClick = (type) => {
        setAlertType(type);
        setShowModal(true);
    };

    const confirmAlert = () => {
        console.log(`${alertType} alert sent!`);
        window.alert(`Your "${alertType}" alert has been sent to your Support Circle.`);
        setShowModal(false);
    };

    return (
        <div style={{textAlign: 'center'}}>
            {showModal && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.header}>Confirm Alert</h2>
                        <p style={styles.subtitle}>Are you sure you want to send an "{alertType}" alert?</p>
                        <div style={{display: 'flex', justifyContent: 'space-around', width: '100%'}}>
                            <button onClick={() => setShowModal(false)} style={{...styles.button, backgroundColor: '#555'}}>Cancel</button>
                            <button onClick={confirmAlert} style={{...styles.button, backgroundColor: '#dc2626'}}>Yes, Send</button>
                        </div>
                    </div>
                </div>
            )}

            <h1 style={styles.header}>Welcome, {userData?.username || 'User'}!</h1>
            <p style={styles.subtitle}>You are not alone. Help is a tap away.</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '48px'}}>
                <button onClick={() => handleAlertClick('I need help')} style={{...styles.button, ...styles.crisisButton}}>
                    I need help
                </button>
                <button onClick={() => handleAlertClick('I need to chat')} style={{...styles.button, ...styles.supportButton}}>
                    I need to chat
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

        if (!friendId.trim()) { setError("Please enter a User ID or Email."); return; }
        if (friendId === user.uid || friendId === user.email) { setError("You cannot add yourself to your circle."); return; }

        try {
            let friendQuery;
            if (friendId.includes('@')) {
                friendQuery = db.collection('users').where('email', '==', friendId);
            } else {
                friendQuery = db.collection('users').where('username', '==', friendId);
            }

            const querySnapshot = await friendQuery.get();

            if (querySnapshot.empty) {
                setError("User not found.");
                return;
            }

            const friendDoc = querySnapshot.docs[0];
            const friendUid = friendDoc.id;

            const circleDocRef = db.collection('supportCircles').doc(user.uid);
            await circleDocRef.set({ 
                members: firebase.firestore.FieldValue.arrayUnion(friendUid) 
            }, { merge: true });

            setSuccess(`Added ${friendDoc.data().username} to your circle!`);
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
                <form onSubmit={handleAddFriend} style={styles.form}>
                    <input type="text" style={styles.input} placeholder="Enter friend's Username or Email" value={friendId} onChange={(e) => setFriendId(e.target.value)} />
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
                            <p style={styles.memberName}>{member.username}</p>
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
    const freeResources = [
        { name: 'National Crisis and Suicide Lifeline', number: '988', link: 'tel:988' },
        { name: 'Crisis Text Line', number: 'Text HOME to 741741', link: 'sms:741741' },
    ];

    const educationalResources = [
        { name: 'Understanding PTSD', description: 'From the National Institute of Mental Health.', link: '#' },
        { name: 'Grounding Techniques for Anxiety', description: 'A helpful guide for managing moments of panic.', link: '#' },
        { name: 'Building a Support System', description: 'Tips on how to talk to friends and family.', link: '#' },
    ]

    return (
        <div>
            <h1 style={styles.header}>Resources</h1>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Immediate Help</h2>
                {freeResources.map(resource => (
                    <a href={resource.link} key={resource.name} style={styles.resourceItem}>
                        <p style={styles.resourceName}>{resource.name}</p>
                        <p style={styles.resourceContact}>{resource.number}</p>
                    </a>
                ))}
            </div>
            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Learn & Understand</h2>
                {educationalResources.map(resource => (
                    <a href={resource.link} key={resource.name} style={styles.resourceItem}>
                        <p style={styles.resourceName}>{resource.name}</p>
                        <p style={styles.resourceDescription}>{resource.description}</p>
                    </a>
                ))}
            </div>
            <div style={styles.card}>
                 <h2 style={styles.cardTitle}>Support Our Mission</h2>
                 <p style={styles.label}>If you find this app helpful, please consider supporting our mission to keep it free and accessible for everyone.</p>
                 <button onClick={() => window.open('https://www.buymeacoffee.com', '_blank')} style={{...styles.button, backgroundColor: '#9333ea', marginTop: '10px'}}>Pay What You Can</button>
            </div>
        </div>
    )
}

function ProfileScreen() {
    const { auth, user, userData, db } = useFirebase();
    const [success, setSuccess] = useState('');

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
                <h2 style={styles.cardTitle}>Ambassador Program</h2>
                <label style={styles.toggleContainer}>
                    <p style={{...styles.label, marginBottom: 0}}>Become an Ambassador</p>
                    <input type="checkbox" checked={userData?.isAmbassador || false} onChange={handleAmbassadorToggle} />
                </label>
            </div>
             <div style={styles.card}>
                <h2 style={styles.cardTitle}>For Organizations</h2>
                <p style={styles.label}>Interested in providing Status Check as a resource for your team or organization? Contact us to learn more.</p>
                <a href="mailto:partnerships@statuscheck.app" style={{...styles.button, textDecoration: 'none', textAlign: 'center'}}>Contact Us</a>
            </div>
            <button onClick={() => auth.signOut()} style={{...styles.button, backgroundColor: '#6b7280'}}>
                Log Out
            </button>
        </div>
    )
}

function SuggestionBoxScreen() {
    const [suggestion, setSuggestion] = useState('');
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!suggestion.trim()) return;
        console.log("Suggestion submitted:", suggestion);
        setSuggestion('');
        setIsSent(true);
        setTimeout(() => setIsSent(false), 3000);
    };

    return (
        <div>
            <h1 style={styles.header}>Suggestion Box</h1>
            <div style={styles.card}>
                <p style={styles.label}>Have an idea to improve the app? We'd love to hear it!</p>
                <form onSubmit={handleSubmit}>
                    <textarea 
                        style={{...styles.input, height: '120px', resize: 'vertical'}}
                        placeholder="Type your suggestion here..."
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                    />
                    <button type="submit" style={styles.button}>Submit Suggestion</button>
                    {isSent && <p style={styles.successText}>Thank you for your feedback!</p>}
                </form>
            </div>
        </div>
    );
}


// --- Navigation ---
function BottomNavBar({ currentPage, setCurrentPage }) {
    const navItems = ['Home', 'My Circle', 'Journal', 'Resources', 'Profile', 'Suggestions'];
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
  usernameStatus: {
      fontSize: '12px',
      textAlign: 'right',
      marginTop: '-12px',
      marginBottom: '12px',
      height: '14px',
  },
  suggestionsContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  suggestionButton: {
      backgroundColor: '#374151',
      color: '#d1d5db',
      border: '1px solid #4b5563',
      borderRadius: '12px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
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
      display: 'flex',
      flexDirection: 'column',
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
  resourceDescription: {
      color: '#d1d5db',
      fontSize: '12px',
      marginTop: '4px',
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
