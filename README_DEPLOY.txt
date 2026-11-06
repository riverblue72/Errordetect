SurfaceTrace · Errordetect 배포 준비본

이 ZIP은 원본 홈페이지와 한국어·영어 발표용 시연을 합친 최종 파일입니다.
GitHub 저장소나 공개 사이트에 반영되었다는 뜻은 아닙니다.

1. 저장소에 반영
- ZIP 전체를 압축 해제합니다.
- Errordetect_Ready_to_Publish 폴더 안의 내용을 riverblue72/Errordetect 저장소 루트에 복사합니다.
- docs, web, scripts 등이 저장소 바로 아래에 있어야 합니다. 상위 폴더 자체를 올리지 마세요.
- 변경 사항을 확인하고 main 브랜치에 커밋합니다.
- 기존 검수·보고서 파일도 포함되어 있습니다.

2. GitHub Pages 활성화
저장소: https://github.com/riverblue72/Errordetect
Settings → Pages → Build and deployment에서 다음을 선택하고 Save를 누릅니다.
- Source: Deploy from a branch
- Branch: main
- Folder: /docs
빌드가 완료되면 Pages 화면의 Visit site로 접속합니다.

배포 완료 후 예상 주소
- 홈페이지: https://riverblue72.github.io/Errordetect/
- 영어 시연: https://riverblue72.github.io/Errordetect/presenter-en.html
- 한국어 시연: https://riverblue72.github.io/Errordetect/presenter.html
홈페이지의 Open demo 또는 상단 Demo 링크가 영어 시연으로 연결됩니다.
시연 화면의 언어 링크로 한국어와 영어를 전환할 수 있습니다.

3. 배포 전 내 컴퓨터에서 확인
압축을 푼 프로젝트 폴더에서 다음 명령을 실행합니다.
python3 -m http.server 8766 --bind 127.0.0.1 --directory docs
브라우저에서 http://127.0.0.1:8766/ 을 엽니다.
Windows에서 python3 명령이 없으면 python으로 바꾸세요.

4. 다음에 수정할 때
web 폴더가 편집용 원본이며 docs는 배포용 결과입니다.
필요한 Python 패키지를 설치한 후 아래 명령으로 다시 빌드합니다.
python3 scripts/build_site.py
web 원본과 새로 생성된 docs를 함께 커밋합니다.

포함된 내용
- 첨부 ZIP의 원본 홈페이지, 그림, 사진, 히트맵, 동영상
- 가로 오버뷰부터 기준 후보 평가·결과까지 이어지는 8단계 시연
- 단계별 설정 근거와 실험 수치
- 원본 남색 그래프 패널·민트 점수선·주황색 검수 표시를 적용한 영어 버전
- 한국어 버전 및 기존 저장소의 검수·보고서 소스
