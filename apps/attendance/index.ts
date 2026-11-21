import { registerRootComponent } from 'expo';

// First import on purpose: a bundle built with a non-https API URL fails here, before any screen.
import './src/config';
import { App } from './App';

// Works in Expo Go and in a native build alike (sets up AppRegistry for the main component).
registerRootComponent(App);
