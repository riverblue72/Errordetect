# 팀 작업 안내

## 코드와 시연 사이트

- `https://github.com/riverblue72/Errordetect`: 팀 코드의 기준 저장소입니다.
- `https://surface-trace-labeling-demo.ableolm2049.chatgpt.site`: 현재 배포된 공개 시연 화면입니다. 링크가 있는 누구나 접속할 수 있으므로 팀원에게 이 주소를 전달하면 됩니다.
- GitHub 수정 사항이 ChatGPT Sites에 자동 배포되는 연결은 없습니다. 변경한 버전은 로컬에서 확인한 뒤 별도로 배포해야 합니다.

공개 저장소이므로 누구나 코드를 받을 수 있지만, 직접 브랜치를 올리려면 저장소 관리자가 GitHub의 **Settings → Collaborators**에서 해당 팀원을 초대해야 합니다. 쓰기 권한이 없는 팀원은 fork 후 Pull Request를 보낼 수도 있습니다.

## 실행과 개발 환경

완성본만 확인할 때는 의존성 설치 없이 다음과 같이 실행합니다.

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory docs
```

브라우저에서 `http://127.0.0.1:8766/`을 엽니다. Python 실행 명령이 `python`인 환경에서는 `python3`를 `python`으로 바꾸세요.

소스를 수정하고 다시 빌드할 때는 최초 한 번 개발 환경을 준비합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/build_site.py
```

Windows PowerShell의 가상환경 활성화 명령은 `.venv\Scripts\Activate.ps1`입니다. 제공된 정상 기준 모델과 예제 사진만으로 사이트를 빌드할 수 있으므로, 전체 원본 데이터셋을 다시 받을 필요는 없습니다.

## 어디를 수정하나요?

| 파일 | 담당 화면 또는 기능 |
| --- | --- |
| `web/landing.html` | 메인 소개와 HOW IT WORKS 01–09 |
| `web/site.css`, `web/method-studio.css` | 메인 디자인과 과정 설명 그림 |
| `web/inspector.html`, `web/app.js` | 기존 샘플 분석 화면 |
| `web/workspace.html`, `web/workspace.js`, `web/workspace.css` | 라벨 초안·박스 편집·검수 화면 |
| `web/anomaly-core.js`, `web/analyzer-worker.js` | 브라우저 추론과 영역 초안 생성 |
| `web/workspace-store.js` | 브라우저의 검수 데이터 저장 |
| `web/report.html`, `web/report.js` | 일일 보고서·JSON 내보내기 |
| `model/` | 정상 기준 모델과 평가 |
| `scripts/build_site.py` | `web/`와 모델을 배포용 `docs/`로 변환 |

`docs/`는 생성 결과입니다. 직접 수정하면 다음 빌드에서 덮어써질 수 있으므로 `web/` 등의 원본을 수정하고 다시 빌드하세요. 현재 디자인은 아홉 단계 모두 흰 배경, 대표 제목은 영어, 세부 설명은 한국어입니다.

## 변경 사항 올리기

작업 시작 전에 변경 사항을 저장한 상태에서 최신 `main`을 받고, 작업별 브랜치를 만듭니다.

```bash
git switch main
git pull --ff-only
git switch -c feat/review-improvement
```

수정 후 빌드하고 위 로컬 서버로 확인합니다.

```bash
python scripts/build_site.py
git status --short
git add web docs
git commit -m "Improve label review"
git push -u origin feat/review-improvement
```

위 `git add` 예시는 화면 수정에 해당합니다. `model/`, `scripts/`, 문서도 수정했다면 해당 파일을 함께 추가합니다. GitHub에서 Pull Request를 열어 팀원 검토 후 `main`에 병합합니다. 소스와 재생성한 `docs/`를 같은 변경에 포함하세요.

## 기능 확인

먼저 로컬 서버를 켠 상태에서, 별도 터미널에서 다음을 실행합니다.

```bash
npm ci
npx playwright install chromium
npm run smoke:workspace
npm run visual
```

`smoke:workspace`는 박스 추가·이동·크기 조절·삭제·되돌리기, 검수 확정, 새로고침 후 저장, 이미지 업로드, 보고서·내보내기와 기존 분석 화면을 확인합니다. `visual`은 여러 화면 크기와 이미지 로딩, 아홉 단계의 흰 배경을 확인합니다. 이미 설치된 Chrome을 쓰려면 `CHROME_PATH`를 설정할 수 있습니다. 다른 주소를 검사할 때는 `SITE_URL`을 설정합니다.

## 배포와 시연 범위

현재 ChatGPT Sites 주소는 웹사이트 배포 주소이며, GitHub는 코드 협업 저장소입니다. 같은 주소로 계속 시연해도 되지만 접근 권한과 재배포는 별도로 관리해야 합니다.

GitHub에서 웹사이트까지 관리하려면 저장소의 **Settings → Pages**에서 **Deploy from a branch**, **main**, **/docs**를 선택할 수 있습니다. 설정 후 GitHub에 표시되는 배포 주소를 공유하세요. 아직 Pages 설정을 켜지 않은 상태에서는 저장소 주소만으로 웹사이트가 실행되지 않습니다.

검수 내용과 업로드 사진은 각자의 브라우저 IndexedDB에 저장됩니다. 팀원이 같은 주소에 접속해도 다른 사람의 검수 결과가 자동으로 보이지 않습니다. 현재는 각자 JSON으로 내보내 공유할 수 있고, 공동 작업 데이터를 실시간으로 합치려면 서버와 공용 저장소를 추가해야 합니다.

AI 초안은 기존 정상 기준 모델의 이상 점수로 생성됩니다. 결함 유형은 사람이 선택하며, 보고서는 확정 결과를 집계합니다. 실제 결함 깊이 측정, 모델 재학습, 생산 시스템 연결은 시연 기능에 포함되지 않습니다.

예제 데이터와 기존 코드의 출처·이용 조건은 [README의 Data attribution](README.md#data-attribution)을 유지합니다. 원본 전체 데이터셋, 개인 업로드 이미지, 인증 정보, `.env` 파일은 저장소에 추가하지 않습니다.
