# Firebase Setup Runbook

This app only requires Firebase Authentication and Cloud Firestore for core operation.
Firebase Hosting is optional and is not required for local development or Docker/Kubernetes deployment.

## What the code expects

- Authentication provider: Google Sign-In
- Firestore collections:
  - `projects`
  - `projects/{projectId}/tasks`
- Firestore security rules source: `firestore.rules`
- Required web config env vars:
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`

## Console setup

1. Create or open a Firebase project.
2. Register a Web app from Project settings.
3. Copy the Web app config into `.env.local`.
4. Open `Authentication`.
5. Enable `Google` under `Sign-in method`.
6. Open `Firestore Database`.
7. Create the database in `Production mode`.
8. Choose a region. For users in Japan, `asia-northeast1` is the practical default.
9. Open the `Rules` tab in Firestore.
10. Paste the contents of `firestore.rules` and publish.

## Important auth note for local development

If Google sign-in fails with `auth/unauthorized-domain`, add `localhost` to Authentication -> Settings -> Authorized domains.

This matters for newer Firebase projects because auth-related flows may no longer include `localhost` by default.

## Local CLI setup

1. Install the Firebase CLI or use `npx firebase-tools`.
2. Log in:

```bash
npm run firebase:login
```

3. Create `.firebaserc` from `.firebaserc.example`.
4. Replace `your-firebase-project-id` with the real Firebase project ID.
5. Deploy Firestore rules from this repo:

```bash
npm run firebase:deploy:firestore
```

## Minimal verification checklist

1. `npm run build`
2. `npm run dev`
3. Open `/login`
4. Sign in with Google
5. Open `/projects`
6. Create a project
7. Open the project and create a task
8. Confirm the documents appear in Firestore

## Notes

- This app does not currently require composite Firestore indexes for its core queries.
- AI-related env vars are optional for Firebase operation.
