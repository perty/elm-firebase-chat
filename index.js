import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { query, getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";

import { Elm } from "./app.js";
import * as env from "./env";

//import registerServiceWorker from "./registerServiceWorker";

const firebaseConfig = {
    apiKey: env.ELM_APP_API_KEY,
    authDomain: env.ELM_APP_AUTH_DOMAIN,
    databaseURL: env.ELM_APP_DATABASE_URL,
    projectId: env.ELM_APP_PROJECT_ID,
    storageBucket: env.ELM_APP_STORAGE_BUCKET,
    messagingSenderId: env.ELM_APP_MESSAGING_SENDER_ID,
    appId: env.ELM_APP_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);

const provider = new GoogleAuthProvider();
const auth = getAuth();
const db = getFirestore();

const app = Elm.Main.init({
    node: document.getElementById("root")
});

app.ports.signIn.subscribe(() => {
    console.log("LogIn called");
    signInWithPopup(auth, provider)
        .then(result => {
            result.user.getIdToken().then(idToken => {
                app.ports.signInInfo.send({
                    token: idToken,
                    email: result.user.email,
                    uid: result.user.uid
                });
            });
        })
        .catch(error => {
            app.ports.signInError.send({
                code: error.code,
                message: error.message
            });
        });
});

app.ports.signOut.subscribe(() => {
    console.log("LogOut called");
    signOut(auth);
});

//  Observer on user info
onAuthStateChanged(auth, user => {
    console.log("called");
    if (user) {
        user
            .getIdToken()
            .then(idToken => {
                app.ports.signInInfo.send({
                    token: idToken,
                    email: user.email,
                    uid: user.uid
                });
            })
            .catch(error => {
                console.log("Error when retrieving cached user");
                console.log(error);
            });

        // Set up listened on new messages
        const q = query(collection(db, `users/${user.uid}/messages`));
        onSnapshot(q, querySnapshot => {
            console.log("Received new snapshot");
            const messages = [];

            querySnapshot.forEach(doc => {
                if (doc.data().content) {
                    messages.push(doc.data().content);
                }
            });

            app.ports.receiveMessages.send({
                messages: messages
            });
        });
    }
});

app.ports.saveMessage.subscribe(data => {
    console.log(`saving message to database : ${data.content}`);

    addDoc(collection(db, `users/${data.uid}/messages`), {
        content: data.content
    }).catch(error => {
        app.ports.signInError.send({
            code: error.code,
            message: error.message
        });
    });
});

//registerServiceWorker();