import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View
        testID="not-found-screen"
        className="flex-1 items-center justify-center bg-white p-5"
      >
        <Text className="text-xl font-bold text-black">
          This screen doesn't exist.
        </Text>

        <Link href={"/welcome" as never} testID="go-home-link" className="mt-4 py-4">
          <Text className="text-sm" style={{ color: "#3BAD4E" }}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
