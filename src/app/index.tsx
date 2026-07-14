import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const DEFAULT_URL = "http://192.168.1.178:11434";
const DEFAULT_MODEL = "llama3";

const { width: SW } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SW * 0.82, 340);

const DARK = {
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

const LIGHT = {
  bg: "#F5F5FA",
  surface: "#FFFFFF",
  surface2: "#EDEDF7",
  surface3: "#E3E3F0",
  accent: "#7C3AED",
  accentLight: "#6D28D9",
  accentDim: "rgba(124,58,237,0.10)",
  accentBorder: "rgba(124,58,237,0.22)",
  border: "#E0E0EE",
  borderMid: "#D0D0E8",
  text: "#0F0F1F",
  textSec: "#6B6B90",
  textMuted: "#A0A0BB",
  userBubble: "#7C3AED",
  userBubbleText: "#FFFFFF",
  aiBubbleText: "#2D2D50",
  ok: "#16A34A",
  okGlow: "rgba(22,163,74,0.20)",
  danger: "#EF4444",
  dangerBg: "rgba(239,68,68,0.08)",
  dangerBorder: "rgba(239,68,68,0.20)",
} as const;

type Palette = { [K in keyof typeof DARK]: string };

interface ThemeCtxType {
  c: Palette;
  st: ReturnType<typeof makeStyles>;
  isDark: boolean;
  toggleTheme: () => void;
}
const ThemeCtx = createContext<ThemeCtxType>(null!);
const useAppTheme = () => useContext(ThemeCtx);

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

function TypingIndicator() {
  const { c, st } = useAppTheme();
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

  const s1 = useAnimatedStyle(() => ({
    transform: [{ translateY: y1.value }],
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateY: y2.value }],
  }));
  const s3 = useAnimatedStyle(() => ({
    transform: [{ translateY: y3.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={st.tyRow}>
      <View style={st.aiAvatar}>
        <Ionicons name="hardware-chip" size={14} color={c.accentLight} />
      </View>
      <View style={st.tyBubble}>
        <Animated.View style={[st.tyDot, s1]} />
        <Animated.View style={[st.tyDot, s2]} />
        <Animated.View style={[st.tyDot, s3]} />
      </View>
    </Animated.View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const { c, st } = useAppTheme();
  const isUser = message.role === "user";
  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      style={[st.msgRow, isUser ? st.msgRowUser : st.msgRowAi]}
    >
      {!isUser && (
        <View style={st.aiAvatar}>
          <Ionicons name="hardware-chip" size={14} color={c.accentLight} />
        </View>
      )}
      <View style={[st.bubble, isUser ? st.bubbleUser : st.bubbleAi]}>
        <Text
          style={[st.bubbleText, isUser ? st.bubbleTextUser : st.bubbleTextAi]}
        >
          {message.content}
        </Text>
        <Text
          style={[st.bubbleTime, isUser ? st.bubbleTimeUser : st.bubbleTimeAi]}
        >
          {message.time}
        </Text>
      </View>
    </Animated.View>
  );
}

function EmptyState({ model }: { model: string }) {
  const { c, st } = useAppTheme();
  return (
    <View style={st.emptyWrap}>
      <View style={st.emptyIconWrap}>
        <Ionicons name="hardware-chip" size={38} color={c.accentLight} />
      </View>
      <Text style={st.emptyTitle}>LocalAI Chat</Text>
      <Text style={st.emptyBody}>
        {"Powered by "}
        <Text style={st.emptyAccent}>{model}</Text>
        {" running on your device.\nSend a message to get started."}
      </Text>
      <View style={st.emptyBadge}>
        <Ionicons name="lock-closed" size={12} color={c.textMuted} />
        <Text style={st.emptyBadgeText}>100% private · runs locally</Text>
      </View>
    </View>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  const { st } = useAppTheme();
  const topY = useSharedValue(0);
  const topRot = useSharedValue(0);
  const midOp = useSharedValue(1);
  const botY = useSharedValue(0);
  const botRot = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 220, easing: Easing.out(Easing.quad) };
    if (open) {
      topY.value = withTiming(6, cfg);
      topRot.value = withTiming(45, cfg);
      midOp.value = withTiming(0, { duration: 150 });
      botY.value = withTiming(-6, cfg);
      botRot.value = withTiming(-45, cfg);
    } else {
      topY.value = withTiming(0, cfg);
      topRot.value = withTiming(0, cfg);
      midOp.value = withTiming(1, { duration: 180 });
      botY.value = withTiming(0, cfg);
      botRot.value = withTiming(0, cfg);
    }
  }, [open]);

  const topStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topY.value }, { rotate: `${topRot.value}deg` }],
  }));
  const midStyle = useAnimatedStyle(() => ({ opacity: midOp.value }));
  const botStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: botY.value }, { rotate: `${botRot.value}deg` }],
  }));

  return (
    <View style={st.hamburgerContainer}>
      <Animated.View style={[st.hamburgerBar, st.hamburgerTop, topStyle]} />
      <Animated.View style={[st.hamburgerBar, st.hamburgerMid, midStyle]} />
      <Animated.View style={[st.hamburgerBar, st.hamburgerBot, botStyle]} />
    </View>
  );
}

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
  const { c, st, isDark, toggleTheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={st.drawer}
      contentContainerStyle={[
        st.drawerContent,
        { paddingTop: Math.max(insets.top + 16, 32) },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Logo satırı */}
      <View style={st.drawerLogoRow}>
        <View style={st.drawerLogoBox}>
          <Ionicons name="hardware-chip" size={22} color={c.accentLight} />
        </View>
        <View style={st.drawerTitleGroup}>
          <Text style={st.drawerAppName}>LocalAI Chat</Text>
          <Text style={st.drawerAppSub}>Ollama · On-device</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={14} style={st.drawerCloseBtn}>
          <Ionicons name="close" size={18} color={c.textSec} />
        </Pressable>
      </View>

      <View style={st.divider} />

      {/* Model */}
      <Text style={st.sectionLabel}>MODEL</Text>
      <View style={st.inputRow}>
        <Ionicons name="cube-outline" size={16} color={c.textSec} />
        <TextInput
          style={st.drawerInput}
          value={model}
          onChangeText={onModel}
          placeholder="ör. llama3, mistral"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
      <View style={st.presetRow}>
        {MODEL_PRESETS.map((m) => (
          <Pressable
            key={m}
            onPress={() => onModel(m)}
            style={[st.preset, model === m && st.presetOn]}
          >
            <Text style={[st.presetText, model === m && st.presetTextOn]}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sunucu URL */}
      <Text style={[st.sectionLabel, { marginTop: 26 }]}>SUNUCU URL</Text>
      <View style={st.inputRow}>
        <Ionicons name="globe-outline" size={16} color={c.textSec} />
        <TextInput
          style={st.drawerInput}
          value={serverUrl}
          onChangeText={onServerUrl}
          placeholder="http://192.168.x.x:11434"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
        />
      </View>
      <View style={st.drawerHintRow}>
        <Ionicons
          name="information-circle-outline"
          size={13}
          color={c.textMuted}
        />
        <Text style={st.drawerHintText}>
          Ollama'ın çalıştığı makinenin yerel ağ IP adresi.
        </Text>
      </View>

      <View style={[st.divider, { marginTop: 28 }]} />

      {/* Tema */}
      <Text style={st.sectionLabel}>TEMA</Text>
      <View style={st.themeRow}>
        <Pressable
          onPress={() => !isDark && toggleTheme()}
          style={[st.themeBtn, isDark && st.themeBtnOn]}
        >
          <Ionicons
            name="moon-outline"
            size={15}
            color={isDark ? c.accentLight : c.textSec}
          />
          <Text style={[st.themeBtnText, isDark && st.themeBtnTextOn]}>
            Koyu
          </Text>
        </Pressable>
        <Pressable
          onPress={() => isDark && toggleTheme()}
          style={[st.themeBtn, !isDark && st.themeBtnOn]}
        >
          <Ionicons
            name="sunny-outline"
            size={15}
            color={!isDark ? c.accentLight : c.textSec}
          />
          <Text style={[st.themeBtnText, !isDark && st.themeBtnTextOn]}>
            Açık
          </Text>
        </Pressable>
      </View>

      <View style={[st.divider, { marginTop: 28 }]} />

      {/* Temizle */}
      <Pressable
        onPress={onClear}
        style={({ pressed }) => [st.clearBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="trash-outline" size={16} color={c.danger} />
        <Text style={st.clearBtnText}>Sohbeti Temizle</Text>
      </Pressable>

      {/* Alt bilgi */}
      <View style={st.drawerFooter}>
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={c.textMuted}
        />
        <Text style={st.drawerFooterText}>Tüm veriler cihazınızda kalır</Text>
      </View>
    </ScrollView>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const listRef = useRef<FlatList<Message>>(null);

  const toggleTheme = () => setIsDark((d) => !d);
  const c = isDark ? DARK : LIGHT;
  const st = useMemo(() => makeStyles(c), [isDark]);

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
    drawerX.value = withTiming(0, {
      duration: 260,
      easing: Easing.out(Easing.quad),
    });
    backdropOp.value = withTiming(1, { duration: 240 });
  };

  const closeDrawer = () => {
    drawerX.value = withTiming(-DRAWER_WIDTH, {
      duration: 220,
      easing: Easing.in(Easing.quad),
    });
    backdropOp.value = withTiming(0, { duration: 200 });
    setTimeout(() => setDrawerOpen(false), 230);
  };

  // ── Mesaj gönder
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      time: getTime(),
    };
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
        {
          id: uid(),
          role: "assistant",
          content: content.trim(),
          time: getTime(),
        },
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
    <ThemeCtx.Provider value={{ c, st, isDark, toggleTheme }}>
      <View style={st.root}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={c.bg}
        />

        <SafeAreaView style={st.safe} edges={["top"]}>
          {/* ── Header ── */}
          <View style={st.header}>
            <Pressable
              onPress={openDrawer}
              hitSlop={10}
              style={st.headerIconBtn}
            >
              <HamburgerIcon open={drawerOpen} />
            </Pressable>

            <View style={st.headerCenter}>
              <View style={st.dotWrap}>
                <Animated.View style={[st.dotRing, dotRingStyle]} />
                <View style={st.dot} />
              </View>
              <Text style={st.headerTitle}>LocalAI</Text>
              <Text style={st.headerSep}>·</Text>
              <Text style={st.headerSub}>Chat</Text>
            </View>

            <View style={st.modelPill}>
              <Ionicons name="cube" size={10} color={c.accentLight} />
              <Text style={st.modelPillText} numberOfLines={1}>
                {model}
              </Text>
            </View>
          </View>

          {/* ── Sohbet gövdesi ── */}
          <KeyboardAvoidingView
            style={st.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={st.listContent}
              ListEmptyComponent={<EmptyState model={model} />}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: false })
              }
            />

            {isLoading && <TypingIndicator />}

            {/* ── Giriş çubuğu ── */}
            <View style={st.inputWrap}>
              <View style={st.inputBar}>
                <TextInput
                  style={st.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Bir mesaj yazın…"
                  placeholderTextColor={c.textMuted}
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
                    style={[st.sendBtn, canSend ? st.sendBtnOn : st.sendBtnOff]}
                  >
                    <Ionicons name="arrow-up" size={18} color="#FFF" />
                  </Pressable>
                </Animated.View>
              </View>
              <Text style={st.inputHint}>Powered by Ollama · %100 yerel</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ── Drawer katmanı ── */}
        {drawerOpen && (
          <>
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <Animated.View style={[st.backdrop, backdropStyle]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[st.drawerWrap, drawerStyle]}>
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
    </ThemeCtx.Provider>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
    flex: { flex: 1 },

    // ── Hamburger
    hamburgerContainer: {
      width: 18,
      height: 14,
    },
    hamburgerBar: {
      position: "absolute",
      width: 18,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.text,
      left: 0,
    },
    hamburgerTop: { top: 0 },
    hamburgerMid: { top: 6 },
    hamburgerBot: { top: 12 },

    // ── Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 10,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.okGlow,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.ok,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      letterSpacing: 0.2,
    },
    headerSep: {
      fontSize: 17,
      color: c.textMuted,
      fontWeight: "300",
      marginHorizontal: -2,
    },
    headerSub: { fontSize: 17, fontWeight: "400", color: c.textSec },
    modelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.accentDim,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.accentBorder,
      maxWidth: 110,
    },
    modelPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: c.accentLight,
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
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.userBubble,
      borderBottomRightRadius: 4,
      elevation: 5,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.38,
      shadowRadius: 10,
    },
    bubbleAi: {
      backgroundColor: c.surface2,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    bubbleTextUser: { color: c.userBubbleText },
    bubbleTextAi: { color: c.aiBubbleText },
    bubbleTime: { fontSize: 10, fontWeight: "500" },
    bubbleTimeUser: { color: "rgba(245,243,255,0.42)", textAlign: "right" },
    bubbleTimeAi: { color: c.textMuted },

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
      backgroundColor: c.surface2,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    tyDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: c.accentLight,
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
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      elevation: 8,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: c.text,
      letterSpacing: 0.3,
    },
    emptyBody: {
      fontSize: 14,
      color: c.textSec,
      textAlign: "center",
      lineHeight: 23,
    },
    emptyAccent: { color: c.accentLight, fontWeight: "600" },
    emptyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surface2,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 4,
    },
    emptyBadgeText: { fontSize: 12, color: c.textMuted },

    // ── Giriş
    inputWrap: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: 6,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: c.surface2,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: c.borderMid,
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
      color: c.text,
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
      backgroundColor: c.accent,
      elevation: 4,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
    },
    sendBtnOff: { backgroundColor: c.surface3 },
    inputHint: {
      fontSize: 11,
      color: c.textMuted,
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
      backgroundColor: c.surface,
      borderRightWidth: 1,
      borderRightColor: c.border,
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
      backgroundColor: c.accentDim,
      borderWidth: 1,
      borderColor: c.accentBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    drawerTitleGroup: { flex: 1 },
    drawerAppName: { fontSize: 18, fontWeight: "800", color: c.text },
    drawerAppSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    drawerCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    divider: { height: 1, backgroundColor: c.border, marginVertical: 20 },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      letterSpacing: 1.3,
      marginBottom: 10,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderMid,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    drawerInput: {
      flex: 1,
      fontSize: 14,
      color: c.text,
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
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    presetOn: {
      backgroundColor: c.accentDim,
      borderColor: c.accentBorder,
    },
    presetText: { fontSize: 12, color: c.textSec, fontWeight: "500" },
    presetTextOn: { color: c.accentLight, fontWeight: "600" },

    drawerHintRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginTop: 10,
    },
    drawerHintText: {
      flex: 1,
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 18,
    },

    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: c.dangerBg,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    clearBtnText: { fontSize: 14, fontWeight: "600", color: c.danger },

    // ── Tema toggle
    themeRow: {
      flexDirection: "row",
      gap: 10,
    },
    themeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
    },
    themeBtnOn: {
      backgroundColor: c.accentDim,
      borderColor: c.accentBorder,
    },
    themeBtnText: { fontSize: 13, fontWeight: "500", color: c.textSec },
    themeBtnTextOn: { color: c.accentLight, fontWeight: "600" },

    drawerFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 36,
    },
    drawerFooterText: { fontSize: 12, color: c.textMuted },
  });
