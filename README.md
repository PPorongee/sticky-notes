# 포스트잇 보드 (Sticky Notes)

복사·캡처한 정보를 `Ctrl+V` 한 번으로 보드에 “붙이는” 디지털 포스트잇 웹앱입니다.

React + TypeScript + Vite + Tailwind CSS, 외부 백엔드 없이 **IndexedDB**에 저장됩니다.

---

## 1. 실행 방법

```bash
cd C:\Users\jshim\sticky-notes
npm install
npm run dev
```

표시되는 주소(보통 http://localhost:5173)를 브라우저에서 열면 됩니다.

빌드하려면:

```bash
npm run build      # dist/ 폴더로 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
```

---

## 2. 주요 파일 구조

```
sticky-notes/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
└── src/
    ├── main.tsx              # React 진입점
    ├── App.tsx               # 전체 상태/단축키/붙여넣기 핸들러
    ├── index.css             # Tailwind + 전역 스타일
    ├── types.ts              # Memo, MemoType, MemoColor 타입
    ├── utils.ts              # uid, 색상, URL 판별, blob→dataURL
    ├── db.ts                 # IndexedDB 래퍼 (idb 사용)
    ├── store.ts              # useMemoStore 훅 (상태 + 자동 저장)
    └── components/
        ├── Board.tsx         # 보드 + 빈 화면 안내 + 검색 필터
        ├── StickyNote.tsx    # 포스트잇 (드래그/편집/색상/삭제)
        ├── Toolbar.tsx       # 상단 바
        ├── QuickInput.tsx    # 빠른 메모 입력창
        ├── SearchBar.tsx     # 검색창
        ├── TrashBin.tsx      # 우측 하단 휴지통 아이콘
        ├── TrashPanel.tsx    # 휴지통 사이드 패널
        └── Toast.tsx         # “되돌리기” 토스트
```

---

## 3. 구현된 기능

### 핵심 UX
- [x] `Ctrl/Cmd + V`로 클립보드의 텍스트/이미지를 포스트잇으로 자동 생성
- [x] URL을 붙여넣으면 자동으로 링크 표시(🔗)
- [x] 상단 빠른 입력창 + `Enter`로 메모 생성
- [x] 새로 만든 메모는 화면 중앙 근처에 랜덤 위치로 배치 (겹치지 않게 약간씩 흩어짐)
- [x] 포스트잇 드래그 이동 (Pointer Events 기반, 위치 자동 저장)
- [x] 더블클릭 → textarea 편집, `Esc` 또는 `Ctrl/Cmd+Enter` 또는 포커스 아웃으로 저장
- [x] 색상 4종 (노랑/분홍/파랑/초록) — 각 메모 좌상단 점을 누르면 색상 팔레트
- [x] 텍스트 검색 (이미지 메모는 제외)
- [x] 빈 화면 안내 문구

### 삭제 / 휴지통 UX
- [x] 일반 삭제(× 버튼, `Delete`/`Backspace`, 휴지통으로 드래그)는 **휴지통 이동**
- [x] 일반 삭제 시 confirm 없음 → 토스트 “메모를 휴지통으로 옮겼습니다. 되돌리기”
- [x] 드래그 시 휴지통이 커지고, 그 위로 가져가면 빨갛게 활성화
- [x] 휴지통 아이콘 클릭 → 우측 사이드 패널에 삭제된 메모 목록
- [x] 각 항목: 복원 / 영구 삭제
- [x] 하단 “휴지통 비우기” 버튼 (영구 삭제 / 비우기에만 confirm)

### 자동 저장
- [x] 메모 생성/수정/이동/삭제/복원 모두 IndexedDB에 자동 저장
- [x] 새로고침해도 위치·내용·색상·이미지·휴지통 상태 모두 유지

### 단축키
- `Ctrl/Cmd + V` — 클립보드 내용으로 포스트잇 생성
- `N` — 새 텍스트 메모 (편집 모드로 바로 진입)
- `/` — 검색창 포커스
- `Delete` / `Backspace` — 선택된 포스트잇을 휴지통으로 이동
- `Esc` — 편집 종료 또는 선택 해제

입력창/textarea에 포커스가 있으면 단축키는 무시됩니다.

---

## 4. 이미지 붙여넣기 동작 방식

1. 사용자가 화면(input/textarea 외부)에서 `Ctrl+V`를 누르면 `window`의 `paste` 이벤트가 발생합니다.
2. `App.tsx`의 `handlePaste`가 `e.clipboardData.items`를 순회하며 `image/*` MIME 타입을 찾습니다.
3. 이미지가 있으면 `item.getAsFile()`로 `Blob`을 얻은 뒤, `utils.ts`의 `blobToDataUrl()`이 `FileReader`로 **Base64 data URL** 문자열로 변환합니다.
4. `createMemo({ type: 'image', content: dataUrl })` → 보드 중앙 근처에 이미지 포스트잇 생성.
5. 이 data URL은 IndexedDB의 `memos` 스토어에 그대로 저장되고, 다음에 페이지를 다시 열 때 `<img src={memo.content} />`로 그대로 렌더링됩니다.

이미지가 없고 텍스트만 있으면 텍스트 포스트잇이 만들어지며, `https?://...` 형식이면 자동으로 링크 메모(`type: 'link'`)로 분류돼 클릭 가능한 형태로 보입니다.

---

## 5. 데이터 저장 위치

- **IndexedDB**
  - DB: `sticky-notes-db`
  - Object Store: `memos`
  - 키: `id` (랜덤 문자열)
- 메모 한 건의 구조:

```ts
type Memo = {
  id: string
  type: 'text' | 'image' | 'link' | 'code'
  content: string          // 텍스트 또는 이미지 data URL
  x: number
  y: number
  width?: number
  height?: number
  color: 'yellow' | 'pink' | 'blue' | 'green'
  createdAt: number
  updatedAt: number
  deletedAt?: number | null  // 휴지통이면 timestamp, 아니면 null
}
```

- 보드에는 `deletedAt`이 falsy인 메모만 표시됩니다.
- 휴지통 패널에는 `deletedAt`이 있는 메모만 표시됩니다.
- “복원”은 `deletedAt`을 `null`로 되돌리고, “영구 삭제”/“휴지통 비우기”는 IndexedDB에서 실제로 레코드를 제거합니다.

서버나 클라우드로 데이터를 보내지 않으므로, **브라우저별·도메인별로** 분리되어 저장됩니다. 다른 PC/브라우저와는 자동 동기화되지 않습니다.

---

## 6. 추후 확장 아이디어

- **클라우드 동기화**: 현재 `db.ts`가 단일 진입점이라, Supabase·Firestore·자체 API로 갈아끼우기 쉽습니다. `useMemoStore`의 `persist`만 원격 저장으로 바꾸면 됩니다.
- **태그 / 색상 필터**: `Memo`에 `tags: string[]` 추가 후 Toolbar에 필터 칩 표시.
- **그룹/캔버스 다중화**: `boardId`를 `Memo`에 추가하고 보드 목록 사이드바.
- **이미지 압축 / Blob 저장**: data URL 대신 Blob을 IndexedDB에 직접 저장하고 `URL.createObjectURL` 사용 → 큰 이미지에 용량 절약.
- **OCR / AI 요약**: 이미지 포스트잇에서 텍스트 추출, 긴 메모 자동 요약 (Anthropic / Google Vision 등).
- **공유 링크 / 내보내기**: 보드 전체를 JSON / PNG로 내보내기.
- **모바일 터치 최적화**: 이미 Pointer Events를 쓰고 있어 동작은 합니다. 길게 눌러서 드래그 시작 등 UX 보강 가능.
- **다중 선택 / 일괄 이동**: `Shift+클릭`으로 다중 선택, 함께 드래그.
- **Undo/Redo 히스토리**: 단순 휴지통 되돌리기 외에 모든 동작에 대한 히스토리 스택.

---

## 메모

- 처음 화면에 메모가 하나도 없을 때만 안내 문구가 보입니다.
- 새로 만든 메모는 작은 각도로 살짝 기울어져 “종이” 느낌이 납니다. 드래그하면 똑바로 펴지고 살짝 뜨는 효과가 보입니다.
- 단축키는 입력창 안에서는 작동하지 않습니다 (검색창에 “n”을 칠 때 새 메모가 만들어지는 등의 충돌 방지).
