export const firebaseConfig = {
  apiKey: "AIzaSyD1I9B7-OeTOGes_bpCjeD7eDRdcoEhuGs",
  authDomain: "mersiflab-63b3c.firebaseapp.com",
  projectId: "mersiflab-63b3c",
  storageBucket: "mersiflab-63b3c.appspot.com",
  messagingSenderId: "842937189045",
  appId: "1:842937189045:web:03c4a5ae96c7026b6ff4fc",
  measurementId: "G-0HZCJ4DCDR"
};

// Primary key (existing behavior keeps working)
export const geminiApiKey = "AIzaSyCfbBu08IwDGub-jchmaNi8KtDfAWXmxsA";

// Additional/fallback keys tried when overload or rate-limit occurs (order matters)
export const geminiApiKeys = [
  geminiApiKey,
  "AIzaSyCjYta79MewzaJ2NADeilR_c9LikW9hi90", // fallback provided by user
];
