import "react-native-get-random-values";
// Eagerly register expo-web-browser at the app root so @better-auth/expo's
// runtime require("expo-web-browser") (used for Google OAuth) always resolves,
// regardless of Expo Router's lazy screen bundling.
import "expo-web-browser";
import { LogBox } from "react-native";
import "./global.css";
import "expo-router/entry";

LogBox.ignoreLogs([
  "Expo AV has been deprecated",
  "Disconnected from Metro",
  "SafeAreaView has been deprecated",
]);
