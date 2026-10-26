import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const baseData = docSnap.data();
            let mergedData = { ...baseData, id: user.uid };

            // If the user is a farmer, fetch their verification status
            if (baseData.role === "farmer") {
              const farmerQuery = query(collection(db, "farmers"), where("userId", "==", user.uid));
              const farmerSnap = await getDocs(farmerQuery);
              if (!farmerSnap.empty) {
                mergedData = { ...mergedData, ...farmerSnap.docs[0].data() };
              }
            }
            setUserData(mergedData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false); 
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);