const STORAGE_KEYS = {
  nickname: "onlinePray.nickname",
  muted: "onlinePray.mutedNicknames",
  onboarding: "onlinePray.onboardingDismissed",
  lastRitual: "onlinePray.lastRitual",
  mutedSound: "onlinePray.mutedSound",
};

const wishes = [
  "오늘의 빌드는 한 번에 초록색으로 지나갑니다.",
  "캐시는 맑고 의존성은 조용하며 테스트는 평온합니다.",
  "머지 직후에도 아무 일 없었던 것처럼 배포됩니다.",
  "로컬에서만 되던 코드가 서버에서도 공손하게 동작합니다.",
  "타임아웃은 물러가고 로그는 필요한 말만 남깁니다.",
  "마지막 커밋 메시지의 자신감만큼 빌드가 단단합니다.",
  "패키지 매니저가 오늘은 오래 생각하지 않습니다.",
  "CI가 초록불을 켜고 모두를 조용히 퇴근시킵니다.",
];

const ritualData = {
  incense: {
    icon: "향",
    messages: [
      "향이 올라갑니다. 오래된 캐시가 조용히 마음을 바꿉니다.",
      "연기가 지나간 자리마다 경고 하나쯤은 착해집니다.",
      "의존성 트리가 잠시 명상을 시작했습니다.",
    ],
  },
  chant: {
    icon: "{ }",
    messages: [
      "npm run build, npm run build, 에러는 리뷰에서 이미 잡혔다.",
      "괄호의 짝이 맞고 세미콜론의 마음도 평온합니다.",
      "타입 시스템이 고개를 끄덕이는 소리가 들립니다.",
    ],
  },
  talisman: {
    icon: "符",
    messages: [
      "부적이 떠오릅니다. flaky test가 오늘은 고정값처럼 행동합니다.",
      "릴리즈 노트의 빈칸까지 운 좋게 채워졌습니다.",
      "핫픽스의 기운은 멀리 보내고 안정 버전의 기운만 남깁니다.",
    ],
  },
  bell: {
    icon: "딩",
    messages: [
      "딩. 알림음이 아니라 성공 사운드였으면 합니다.",
      "종소리가 울리고 대시보드가 잠시 초록색으로 반짝입니다.",
      "한 번 울렸으니 재시도 버튼은 쉬어도 됩니다.",
    ],
  },
};

const badWords = ["욕설", "바보", "멍청", "죽어"];
const adjectives = ["조용한", "침착한", "간절한", "명랑한", "단호한", "깨끗한"];
const nouns = ["빌더", "배포자", "리뷰어", "테스터", "머지러", "캐시지기"];
const seedMessages = [
  ["침착한 빌더", "오늘은 경고 0개로 지나가길."],
  ["명랑한 리뷰어", "CI가 잠깐 생각하더니 초록색을 보여줬으면."],
  ["깨끗한 캐시지기", "물 갈았습니다. 이제 패키지 잠금 파일도 평온하길."],
];

let waterCooldownUntil = 0;
let ritualCooldownUntil = 0;
let chatCooldownUntil = 0;
let recentWishIndexes = [];
let selectedRitual = localStorage.getItem(STORAGE_KEYS.lastRitual) || "incense";
let messages = [];
let hiddenMessageIds = new Set();
let mutedNicknames = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.muted) || "[]"));

const $ = (selector) => document.querySelector(selector);

const nicknameEl = $("#nickname");
const waterButton = $("#refresh-water");
const waterCooldownText = $("#water-cooldown-text");
const waterProgress = $("#water-progress");
const waterFill = $("#water-fill");
const glass = $("#glass");
const wishText = $("#wish-text");
const prayerState = $("#prayer-state");
const ritualButtons = Array.from(document.querySelectorAll(".ritual"));
const ritualStage = $("#ritual-stage");
const ritualIcon = $("#ritual-icon");
const ritualMessage = $("#ritual-message");
const ritualCooldownText = $("#ritual-cooldown-text");
const runRitualButton = $("#run-ritual");
const chatLog = $("#chat-log");
const chatForm = $("#chat-form");
const chatInput = $("#chat-input");
const sendChatButton = $("#send-chat");
const chatNote = $("#chat-note");
const onboarding = $("#onboarding");
const newMessageButton = $("#new-message");
const muteToggle = $("#mute-toggle");

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getNickname() {
  const saved = localStorage.getItem(STORAGE_KEYS.nickname);
  if (saved) {
    return saved;
  }

  const nickname = `${randomItem(adjectives)} ${randomItem(nouns)} ${Math.floor(Math.random() * 90 + 10)}`;
  localStorage.setItem(STORAGE_KEYS.nickname, nickname);
  return nickname;
}

function pickWish() {
  const available = wishes
    .map((_, index) => index)
    .filter((index) => !recentWishIndexes.includes(index));
  const pool = available.length > 0 ? available : wishes.map((_, index) => index);
  const index = randomItem(pool);
  recentWishIndexes = [index, ...recentWishIndexes].slice(0, 3);
  wishText.textContent = wishes[index];
}

function playTone(frequency = 660, duration = 0.08) {
  if (muteToggle.checked) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function startWaterRitual() {
  const now = Date.now();
  if (now < waterCooldownUntil) {
    return;
  }

  waterCooldownUntil = now + 8000;
  waterFill.style.height = `${58 + Math.floor(Math.random() * 27)}%`;
  waterFill.style.filter = `hue-rotate(${Math.floor(Math.random() * 22)}deg)`;
  glass.classList.remove("pour");
  void glass.offsetWidth;
  glass.classList.add("pour");
  prayerState.textContent = "기도 진행 중";
  pickWish();
  playTone(720, 0.09);

  window.setTimeout(() => {
    prayerState.textContent = "기도 완료";
  }, 1100);
}

function selectRitual(key) {
  selectedRitual = key;
  localStorage.setItem(STORAGE_KEYS.lastRitual, key);

  ritualButtons.forEach((button) => {
    const isSelected = button.dataset.ritual === key;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-checked", String(isSelected));
  });

  ritualIcon.textContent = ritualData[key].icon;
}

function runRitual() {
  const now = Date.now();
  if (now < ritualCooldownUntil) {
    return;
  }

  ritualCooldownUntil = now + 10000;
  const data = ritualData[selectedRitual];
  ritualIcon.textContent = data.icon;
  ritualMessage.textContent = randomItem(data.messages);
  ritualStage.classList.remove("active");
  void ritualStage.offsetWidth;
  ritualStage.classList.add("active");
  playTone(520, 0.12);
}

function maskMessage(text) {
  return badWords.reduce((result, word) => {
    const pattern = new RegExp(word, "gi");
    return result.replace(pattern, "*".repeat(word.length));
  }, text);
}

function isAtBottom() {
  return chatLog.scrollTop + chatLog.clientHeight >= chatLog.scrollHeight - 20;
}

function addMessage(nickname, body, isMine = false) {
  messages.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    nickname,
    body: maskMessage(body),
    isMine,
    sentAt: Date.now(),
  });
  renderMessages();
}

function renderMessages() {
  const shouldStick = isAtBottom();
  chatLog.innerHTML = "";

  messages
    .filter((message) => !hiddenMessageIds.has(message.id))
    .filter((message) => !mutedNicknames.has(message.nickname))
    .forEach((message) => {
      const item = document.createElement("article");
      item.className = "message";

      const head = document.createElement("div");
      head.className = "message-head";
      head.innerHTML = `<strong>${message.nickname}</strong><span>${relativeTime(message.sentAt)}</span>`;

      const actions = document.createElement("div");
      actions.className = "message-actions";

      const report = document.createElement("button");
      report.type = "button";
      report.textContent = "신고";
      report.addEventListener("click", () => {
        hiddenMessageIds.add(message.id);
        renderMessages();
        chatNote.textContent = "신고 완료: 해당 메시지를 내 화면에서 숨겼습니다.";
      });

      const mute = document.createElement("button");
      mute.type = "button";
      mute.textContent = "뮤트";
      mute.addEventListener("click", () => {
        mutedNicknames.add(message.nickname);
        localStorage.setItem(STORAGE_KEYS.muted, JSON.stringify(Array.from(mutedNicknames)));
        renderMessages();
        chatNote.textContent = `${message.nickname} 메시지를 내 화면에서 숨겼습니다.`;
      });

      actions.append(report, mute);
      head.append(actions);

      const body = document.createElement("div");
      body.className = "message-body";
      body.textContent = message.body;

      item.append(head, body);
      chatLog.append(item);
    });

  if (shouldStick) {
    chatLog.scrollTop = chatLog.scrollHeight;
    newMessageButton.hidden = true;
  } else {
    newMessageButton.hidden = false;
  }
}

function relativeTime(time) {
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 5) {
    return "방금";
  }
  if (seconds < 60) {
    return `${seconds}초 전`;
  }
  return `${Math.floor(seconds / 60)}분 전`;
}

function sendChat(event) {
  event.preventDefault();

  const now = Date.now();
  const value = chatInput.value.trim();
  if (!value) {
    return;
  }

  if (now < chatCooldownUntil) {
    chatNote.textContent = `잠시 후 다시 전송할 수 있습니다.`;
    return;
  }

  chatCooldownUntil = now + 3000;
  addMessage(getNickname(), value, true);
  chatInput.value = "";
  chatNote.textContent = "기도 접수 완료. 빌드 로그를 지켜봅니다.";
  playTone(840, 0.07);
}

function updateCooldowns() {
  const now = Date.now();

  const waterLeft = Math.max(0, waterCooldownUntil - now);
  waterButton.disabled = waterLeft > 0;
  waterCooldownText.textContent =
    waterLeft > 0 ? `${Math.ceil(waterLeft / 1000)}초 뒤 다시 갈 수 있습니다.` : "지금 바로 가능합니다.";
  waterProgress.style.width = waterLeft > 0 ? `${100 - (waterLeft / 8000) * 100}%` : "0%";

  const ritualLeft = Math.max(0, ritualCooldownUntil - now);
  runRitualButton.disabled = ritualLeft > 0;
  ritualCooldownText.textContent = ritualLeft > 0 ? `${Math.ceil(ritualLeft / 1000)}초 대기` : "준비 완료";

  const chatLeft = Math.max(0, chatCooldownUntil - now);
  sendChatButton.disabled = chatLeft > 0;
  if (chatLeft > 0) {
    chatNote.textContent = `${Math.ceil(chatLeft / 1000)}초 뒤 다음 메시지를 보낼 수 있습니다.`;
  }
}

function setupOnboarding() {
  if (localStorage.getItem(STORAGE_KEYS.onboarding) !== "true") {
    onboarding.hidden = false;
  }

  $("#dismiss-onboarding").addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEYS.onboarding, "true");
    onboarding.hidden = true;
  });

  $("#jump-water").addEventListener("click", () => {
    waterButton.scrollIntoView({ block: "center", behavior: "smooth" });
    waterButton.focus();
  });

  $("#jump-chat").addEventListener("click", () => {
    chatInput.scrollIntoView({ block: "center", behavior: "smooth" });
    chatInput.focus();
  });
}

function init() {
  nicknameEl.textContent = getNickname();
  muteToggle.checked = localStorage.getItem(STORAGE_KEYS.mutedSound) === "true";
  muteToggle.addEventListener("change", () => {
    localStorage.setItem(STORAGE_KEYS.mutedSound, String(muteToggle.checked));
  });

  pickWish();
  selectRitual(selectedRitual);
  seedMessages.forEach(([name, body]) => addMessage(name, body));

  waterButton.addEventListener("click", startWaterRitual);
  runRitualButton.addEventListener("click", runRitual);
  ritualButtons.forEach((button) => {
    button.addEventListener("click", () => selectRitual(button.dataset.ritual));
  });

  document.querySelectorAll("[data-meme]").forEach((button) => {
    button.addEventListener("click", () => {
      chatInput.value = `${chatInput.value}${chatInput.value ? " " : ""}${button.dataset.meme}`;
      chatInput.focus();
    });
  });

  chatForm.addEventListener("submit", sendChat);
  chatLog.addEventListener("scroll", () => {
    if (isAtBottom()) {
      newMessageButton.hidden = true;
    }
  });
  newMessageButton.addEventListener("click", () => {
    chatLog.scrollTop = chatLog.scrollHeight;
    newMessageButton.hidden = true;
  });

  setupOnboarding();
  updateCooldowns();
  window.setInterval(updateCooldowns, 200);
  window.setInterval(renderMessages, 30000);
}

init();
