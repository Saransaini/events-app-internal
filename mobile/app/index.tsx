import { Redirect } from 'expo-router';

// The root path needs a real matched route for the framework to mount the
// app at all (an unmatched "/" serves a static 404 without ever loading the
// client bundle). AuthGate in the root layout already redirects unauthenticated
// visitors to /login before this ever renders, so by the time this mounts the
// user is signed in — send them straight into the app.
export default function Index() {
  return <Redirect href="/discover" />;
}
