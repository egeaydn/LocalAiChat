import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_URL = "http://192.168.1.178:11434"; 
const DEFAULT_MODEL = "llama3";                  

const { width: SW } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SW * 0.82, 340);

const C = {
  bg: "#07070F",
  surface: "#0D0D1C",
  surface2: "#14142A",
  surface3: "#1E1E38",
  accent: "#7C3AED",
  accentLight: "#C4B5FD",
  accentDim: "rgba(124,58,237,0.18)",
  accentBorder: "rgba(124,58,237,0.38)",
  border: "#1B1B35",
  borderMid: "#252545",
  text: "#EEEEFF",
  textSec: "#8A8AB0",
  textMuted: "#4A4A6A",
  userBubble: "#5521B5",
  userBubbleText: "#F5F3FF",
  aiBubbleText: "#D8D8F0",
  ok: "#22C55E",
  okGlow: "rgba(34,197,94,0.30)",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.10)",
  dangerBorder: "rgba(248,113,113,0.28)",
} as const;


type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
}

const uid = () => Math.random().toString(36).slice(2);
const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const y1 = useSharedValue(0);
  const y2 = useSharedValue(0);
  const y3 = useSharedValue(0);

  useEffect(() => {
    const mk = () =>
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    y1.value = mk();
    y2.value = withDelay(140, mk());
    y3.value = withDelay(280, mk());
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: y1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: y2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: y3.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.tyRow}>
      <View style={styles.aiAvatar}>
        <Ionicons name="hardware-chip" size={14} color={C.accentLight} />
      </View>
      <View style={styles.tyBubble}>
        <Animated.View style={[styles.tyDot, s1]} />
        <Animated.View style={[styles.tyDot, s2]} />
        <Animated.View style={[styles.tyDot, s3]} />
      </View>
    </Animated.View>
  );
}

// ─── Mesaj balonu ─────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="hardware-chip" size={14} color={C.accentLight} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAi,
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            isUser ? styles.bubbleTimeUser : styles.bubbleTimeAi,
          ]}
        >
          {message.time}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Boş durum ────────────────────────────────────────────────────────────────
function EmptyState({ model }: { model: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="hardware-chip" size={38} color={C.accentLight} />
      </View>
      <Text style={styles.emptyTitle}>LocalAI Chat</Text>
      <Text style={styles.emptyBody}>
        {"Powered by "}
        <Text style={styles.emptyAccent}>{model}</Text>
        {" running on your device.\nSend a message to get started."}
      </Text>
      <View style={styles.emptyBadge}>
        <Ionicons name="lock-closed" size={12} color={C.textMuted} />
        <Text style={styles.emptyBadgeText}>100% private · runs locally</Text>
      </View>
    </View>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
interface DrawerProps {
  serverUrl: string;
  model: string;
  onServerUrl: (v: string) => void;
  onModel: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const MODEL_PRESETS = ["llama3", "mistral", "gemma3", "phi4"];

function DrawerPanel({
  serverUrl,
  model,
  onServerUrl,
  onModel,
  onClear,
  onClose,
}: DrawerProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.drawer}
      contentContainerStyle={[
        styles.drawerContent,
        { paddingTop: Math.max(insets.top + 16, 32) },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Logo satırı */}
      <View style={styles.drawerLogoRow}>
        <View style={styles.drawerLogoBox}>
          <Ionicons name="hardware-chip" size={22} color={C.accentLight} />
        </View>
        <View style={styles.drawerTitleGroup}>
          <Text style={styles.drawerAppName}>LocalAI Chat</Text>
          <Text style={styles.drawerAppSub}>Ollama · On-device</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={14} style={styles.drawerCloseBtn}>
          <Ionicons name="close" size={18} color={C.textSec} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Model */}
      <Text style={styles.sectionLabel}>MODEL</Text>
      <View style={styles.inputRow}>
        <Ionicons name="cube-outline" size={16} color={C.textSec} />
        <TextInput
          style={styles.drawerInput}
          value={model}
          onChangeText={onModel}
          placeholder="ör. llama3, mistral"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
      <View style={styles.presetRow}>
        {MODEL_PRESETS.map((m) => (
          <Pressable
            key={m}
            onPress={() => onModel(m)}
            style={[styles.preset, model === m && styles.presetOn]}
          >
            <Text style={[styles.presetText, model === m && styles.presetTextOn]}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sunucu URL */}
      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>SUNUCU URL</Text>
      <View style={styles.inputRow}>
        <Ionicons name="globe-outline" size={16} color={C.textSec} />
        <TextInput
          style={styles.drawerInput}
          value={serverUrl}
          onChangeText={onServerUrl}
          placeholder="http://192.168.x.x:11434"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
        />
      </View>
      <View style={styles.drawerHintRow}>
        <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
        <Text style={styles.drawerHintText}>
          Ollama'nın çalıştığı makinenin yerel ağ IP adresi.
        </Text>
      </View>

      <View style={[styles.divider, { marginTop: 28 }]} />

      {/* Temizle */}
      <Pressable
        onPress={onClear}
        style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="trash-outline" size={16} color={C.danger} />
        <Text style={styles.clearBtnText}>Sohbeti Temizle</Text>
      </Pressable>

      {/* Alt bilgi */}
      <View style={styles.drawerFooter}>
        <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
        <Text style={styles.drawerFooterText}>Tüm veriler cihazınızda kalır</Text>
      </View>
    </ScrollView>
  );
}

// ─── Ana ekran ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // ── Animasyonlar
  const drawerX = useSharedValue(-DRAWER_WIDTH);
  const backdropOp = useSharedValue(0);
  const sendScale = useSharedValue(1);
  const dotPulse = useSharedValue(1);

  // Durum noktası nefes alıyor
  useEffect(() => {
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 950, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 950, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const dotRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotPulse.value }],
    opacity: 1.8 - dotPulse.value * 0.65,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));
  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const openDrawer = () => {
    setDrawerOpen(true);
    drawerX.value = withSpring(0, { damping: 22, stiffness: 220 });
    backdropOp.value = withTiming(1, { duration: 240 });
  };

  const closeDrawer = () => {
    drawerX.value = withSpring(-DRAWER_WIDTH, { damping: 22, stiffness: 220 });
    backdropOp.value = withTiming(0, { duration: 200 });
    setTimeout(() => setDrawerOpen(false), 230);
  };

  // ── Mesaj gönder
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: uid(), role: "user", content: text, time: getTime() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInputText("");
    setIsLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const res = await fetch(`${serverUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: next.map(({ role, content }) => ({ role, content })),
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content: string =
        data?.message?.content ?? data?.response ?? "Yanıt alınamadı.";
      setMessages((p) => [
        ...p,
        { id: uid(), role: "assistant", content: content.trim(), time: getTime() },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: uid(),
          role: "assistant",
          content: `Bağlantı hatası.\n\n"${serverUrl}" adresine ulaşılamadı.\n\nOllama'nın çalıştığını ve IP adresinin doğru olduğunu kontrol edin.`,
          time: getTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  const handleSend = () => {
    sendScale.value = withSequence(
      withSpring(0.84, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 400 }),
    );
    sendMessage();
  };

  const canSend = !!inputText.trim() && !isLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={openDrawer} hitSlop={10} style={styles.headerIconBtn}>
            <Ionicons name="menu" size={22} color={C.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.dotWrap}>
              <Animated.View style={[styles.dotRing, dotRingStyle]} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.headerTitle}>LocalAI</Text>
            <Text style={styles.headerSep}>·</Text>
            <Text style={styles.headerSub}>Chat</Text>
          </View>

          <View style={styles.modelPill}>
            <Ionicons name="cube" size={10} color={C.accentLight} />
            <Text style={styles.modelPillText} numberOfLines={1}>
              {model}
            </Text>
          </View>
        </View>

        {/* ── Sohbet gövdesi ── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState model={model} />}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />

          {isLoading && <TypingIndicator />}

          {/* ── Giriş çubuğu ── */}
          <View style={styles.inputWrap}>
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Bir mesaj yazın…"
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={4000}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                editable={!isLoading}
              />
              <Animated.View style={sendBtnStyle}>
                <Pressable
                  onPress={handleSend}
                  disabled={!canSend}
                  style={[
                    styles.sendBtn,
                    canSend ? styles.sendBtnOn : styles.sendBtnOff,
                  ]}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFF" />
                </Pressable>
              </Animated.View>
            </View>
            <Text style={styles.inputHint}>
              Powered by Ollama · %100 yerel
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Drawer katmanı ── */}
      {drawerOpen && (
        <>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.backdrop, backdropStyle]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.drawerWrap, drawerStyle]}>
            <DrawerPanel
              serverUrl={serverUrl}
              model={model}
              onServerUrl={setServerUrl}
              onModel={setModel}
              onClear={() => {
                setMessages([]);
                closeDrawer();
              }}
              onClose={closeDrawer}
            />
          </Animated.View>
        </>
      )}
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dotWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dotRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.okGlow,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.ok,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.2,
  },
  headerSep: { fontSize: 17, color: C.textMuted, fontWeight: "300", marginHorizontal: -2 },
  headerSub: { fontSize: 17, fontWeight: "400", color: C.textSec },
  modelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accentBorder,
    maxWidth: 110,
  },
  modelPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.accentLight,
  },

  // ── Mesaj listesi
  listContent: {
    padding: 16,
    paddingBottom: 10,
    flexGrow: 1,
    gap: 10,
  },

  // ── Mesaj balonu
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAi: { justifyContent: "flex-start" },

  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: C.userBubble,
    borderBottomRightRadius: 4,
    elevation: 5,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
  },
  bubbleAi: {
    backgroundColor: C.surface2,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: C.userBubbleText },
  bubbleTextAi: { color: C.aiBubbleText },
  bubbleTime: { fontSize: 10, fontWeight: "500" },
  bubbleTimeUser: { color: "rgba(245,243,255,0.42)", textAlign: "right" },
  bubbleTimeAi: { color: C.textMuted },

  // ── Yazıyor göstergesi
  tyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tyBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surface2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.accentLight,
  },

  // ── Boş durum
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 60,
    gap: 16,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.3,
  },
  emptyBody: {
    fontSize: 14,
    color: C.textSec,
    textAlign: "center",
    lineHeight: 23,
  },
  emptyAccent: { color: C.accentLight, fontWeight: "600" },
  emptyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surface2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 4,
  },
  emptyBadgeText: { fontSize: 12, color: C.textMuted },

  // ── Giriş
  inputWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: C.surface2,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.borderMid,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: C.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnOn: {
    backgroundColor: C.accent,
    elevation: 4,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  sendBtnOff: { backgroundColor: C.surface3 },
  inputHint: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: "center",
  },

  // ── Backdrop
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.65)",
    zIndex: 10,
  },

  // ── Drawer
  drawerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
  },
  drawer: {
    flex: 1,
    backgroundColor: C.surface,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  drawerContent: { paddingHorizontal: 20, paddingBottom: 48 },

  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  drawerLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitleGroup: { flex: 1 },
  drawerAppName: { fontSize: 18, fontWeight: "800", color: C.text },
  drawerAppSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderMid,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  drawerInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  presetOn: {
    backgroundColor: C.accentDim,
    borderColor: C.accentBorder,
  },
  presetText: { fontSize: 12, color: C.textSec, fontWeight: "500" },
  presetTextOn: { color: C.accentLight, fontWeight: "600" },

  drawerHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  drawerHintText: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  clearBtnText: { fontSize: 14, fontWeight: "600", color: C.danger },

  drawerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 36,
  },
  drawerFooterText: { fontSize: 12, color: C.textMuted },
});
