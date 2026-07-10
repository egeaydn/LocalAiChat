import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


const OLLAMA_BASE_URL = "http://10.10.34.106:11434"; 
const OLLAMA_MODEL = "llama3"; 

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}


function MessageBubble({
  message,
  isDark,
}: {
  message: Message;
  isDark: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAi,
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: isDark ? "#3A3A4A" : "#E2E8F0" },
          ]}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={16}
            color={isDark ? "#A1A1AA" : "#64748B"}
          />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [
                styles.bubbleUser,
                { backgroundColor: isDark ? "#4F46E5" : "#6366F1" },
              ]
            : [
                styles.bubbleAi,
                { backgroundColor: isDark ? "#27272A" : "#F1F5F9" },
              ],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#FFFFFF" : isDark ? "#E4E4E7" : "#1E293B" },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Ana ekran ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const bgColor = isDark ? "#09090B" : "#F8FAFC";
  const headerBg = isDark ? "#18181B" : "#FFFFFF";
  const inputBg = isDark ? "#18181B" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#E2E8F0";
  const placeholderColor = isDark ? "#71717A" : "#94A3B8";
  const textColor = isDark ? "#FAFAFA" : "#0F172A";
  const sendBg =
    isLoading || !inputText.trim()
      ? isDark
        ? "#3F3F46"
        : "#CBD5E1"
      : isDark
        ? "#4F46E5"
        : "#6366F1";

  async function sendMessage() {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: uid(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText("");
    setIsLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sunucu hatası: ${response.status}`);
      }

      const data = await response.json();
      const aiContent: string =
        data?.message?.content ?? data?.response ?? "Yanıt alınamadı.";

      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: aiContent.trim(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = {
        id: uid(),
        role: "assistant",
        content: `Bağlantı hatası. "${OLLAMA_BASE_URL}" adresine ulaşılamadı.\n\nIP adresini ve Ollama'nın çalıştığını kontrol edin.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: bgColor }]}
      edges={["top"]}
    >
      {/* Başlık */}
      <View
        style={[
          styles.header,
          { backgroundColor: headerBg, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.headerDot} />
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Yerel AI Sohbet
        </Text>
        <Text style={[styles.headerModel, { color: placeholderColor }]}>
          {OLLAMA_MODEL}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Mesaj listesi */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isDark={isDark} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubbles-outline"
                size={52}
                color={isDark ? "#3F3F46" : "#CBD5E1"}
              />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                Sohbete başlayın
              </Text>
              <Text style={[styles.emptySubtitle, { color: placeholderColor }]}>
                test mesajı: "Merhaba, nasılsın?"
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Yükleme göstergesi */}
        {isLoading && (
          <View
            style={[
              styles.loadingBar,
              { backgroundColor: inputBg, borderTopColor: borderColor },
            ]}
          >
            <ActivityIndicator
              size="small"
              color={isDark ? "#818CF8" : "#6366F1"}
            />
            <Text style={[styles.loadingText, { color: placeholderColor }]}>
              AI düşünüyor...
            </Text>
          </View>
        )}

        {/* Girdi alanı */}
        <View
          style={[
            styles.inputRow,
            { backgroundColor: inputBg, borderTopColor: borderColor },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#27272A" : "#F1F5F9",
                color: textColor,
                borderColor: borderColor,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Bir mesaj yazın..."
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={4000}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            editable={!isLoading}
          />
          <Pressable
            onPress={sendMessage}
            disabled={isLoading || !inputText.trim()}
            style={[styles.sendButton, { backgroundColor: sendBg }]}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  headerModel: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowAi: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingText: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 25,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
