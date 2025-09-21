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
export const geminiApiKey = "AIzaSyBE_27Q5mMbOOzXDbnTpSarb69xMoBrppo";

// Additional/fallback keys tried when overload or rate-limit occurs (order matters)
export const geminiApiKeys = [
  geminiApiKey,
  "AIzaSyBE_27Q5mMbOOzXDbnTpSarb69xMoBrppo", // fallback provided by user
];
