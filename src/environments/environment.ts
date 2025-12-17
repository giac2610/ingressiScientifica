// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
const firebaseConfig = {
  apiKey: "AIzaSyCWG3BvtGCLsLPwpEJU9vB2edMpygVdFtI",
  authDomain: "ingrressiscientifica.firebaseapp.com",
  projectId: "ingrressiscientifica",
  storageBucket: "ingrressiscientifica.firebasestorage.app",
  messagingSenderId: "283037814528",
  appId: "1:283037814528:web:c2979e2dfc0d31a71eade5",
  measurementId: "G-EW1RE82XN4",
  region: "europe-west8",
  storageBucketUrl: "gs://ingrressiscientifica.firebasestorage.app"
};

export const environment = {
  production: false,
  firebase: firebaseConfig
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
