import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface UserAvatarProps {
  /** User's full name - used to calculate initials if no image */
  name?: string | null;
  /** Image URL for the avatar */
  imageUrl?: string | null;
  /** Size of the avatar in pixels (default: 40) */
  size?: number;
  /** Background color for initials avatar (default: #1B2F6E) */
  backgroundColor?: string;
  /** Text color for initials (default: #FFFFFF) */
  textColor?: string;
}

/**
 * Calculate initials from a name string.
 * Takes first letter of first name and first letter of last name.
 * Falls back to first two characters if only one word.
 */
function getInitials(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // First letter of first name + first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Single word: take first two characters or just first if single char
  return name.slice(0, 2).toUpperCase();
}

/**
 * UserAvatar component that displays either a user's profile image
 * or their initials in a colored circle.
 */
export function UserAvatar({
  name,
  imageUrl,
  size = 40,
  backgroundColor = "#1B2F6E",
  textColor = "#FFFFFF",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const fontSize = Math.floor(size * 0.4);
  const borderRadius = size / 2;

  // If we have a valid image URL and no error, show the image
  if (imageUrl && imageUrl.length > 0 && !imageError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  // Otherwise show initials
  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize,
            color: textColor,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "transparent",
  },
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontWeight: "700",
  },
});

export { getInitials };
