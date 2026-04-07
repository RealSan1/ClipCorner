# Clip Corner

**Manifest** 기반 크롬 확장 프로그램입니다. YouTube 링크를 저장한 뒤, 일반 웹페이지에서 **원하는 영역을 골라** 그 위에 임베드 플레이어를 올려 둡니다. 투명도와 **호버 시에만 표시** 여부를 팝업에서 조절할 수 있습니다.
![gif](https://github.com/user-attachments/assets/de1ccf71-d07f-4eb0-aff3-91974f03569e)

## 주요 기능

- 팝업에 YouTube URL 저장, 오버레이 **투명도(0–100%)** 조절
- **호버할 때만** 비디오 보이기 / 항상 보이기 토글
- 페이지 **우클릭** → **“Choose where the video appears”** 로 배치 모드 진입
- 마우스로 블록을 하이라이트한 뒤 **클릭**해 해당 요소에 임베드 고정
- **Esc** 로 배치 취소
- `youtube.com/watch`, `youtu.be`, Shorts, Live, embed 등 일반적인 영상 ID 형식 지원

## 프로젝트 구조

| 파일 | 역할 |
|------|------|
| `manifest.json` | 확장 메타데이터, 권한, 콘텐츠 스크립트·백그라운드 정의 |
| `popup.html` / `popup.js` | 툴바 팝업 UI, `chrome.storage.local` 저장 |
| `content.js` | 선택 베일·하이라이트, URL 파싱, DOM 래핑 및 iframe 삽입 |
| `background.js` | 컨텍스트 메뉴 등록, `executeScript`로 배치 모드 호출 |
| `icons/` | 확장 아이콘 |


## 사용 방법

1. 확장 아이콘을 눌러 팝업을 엽니다.
2. YouTube 링크를 붙여 넣고, 투명도·호버 옵션을 설정한 뒤 **Save** 합니다.
3. 비디오를 올릴 **일반 http/https 페이지**에서 우클릭 → **Choose where the video appears**를 선택합니다.
4. 빨간 테두리로 영역을 확인하고, 원하는 위치를 **왼쪽 클릭**합니다.

`chrome://` 페이지, Chrome 웹스토어, PDF 뷰어 등 **제한된 탭**에서는 동작하지 않을 수 있습니다.

## 권한

- **activeTab** — 사용자가 메뉴로 연 탭에서 배치·오버레이 실행
- **scripting** — 해당 탭에 배치 모드 진입용 스크립트 실행
- **contextMenus** — “Choose where the video appears” 메뉴 항목
- **storage** — URL·투명도·호버 설정 로컬 저장

콘텐츠 스크립트는 `http://*/*`, `https://*/*`에 매칭됩니다.

## 원격 코드

확장 패키지에 포함된 JS만 사용하며, 외부에서 임의의 스크립트를 불러와 실행하지 않습니다. 재생은 YouTube가 제공하는 표준 `<iframe>` 임베드로 처리됩니다.

## 요구 사항

- Google Chrome
