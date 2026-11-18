작업 폴더는 mori 3D 웹 사이트(three.js)야. `model/ASTRA_BRIEF.md`를 처음부터 끝까지 읽고 그대로 작업해 줘.

- 목표: Blender 5.3(`C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe`)을 백그라운드로 돌리는 파이썬 스크립트로 `assets/models/shop.glb`, `jar.glb`, `contents.glb`를 만든다. 실제로 있을 법한 밤의 작은 가게처럼 현실적으로 만든다.
- 파일은 `model/`과 `assets/models/` 안에만 쓴다. `store.js`, `site.js`, `index.html`, `touch/`는 읽기만 한다(지금 코드가 어떤 크기와 위치로 장면을 만드는지는 `store.js`에서 확인할 수 있다).
- 블렌더 임시 파일과 구운 텍스처는 `model/tmp/`에 둔다.
- 노드 이름, 좌표, 비워 둘 구간, 용량 한도는 요구서를 정확히 지킨다.
- 끝나기 전에 `model/src/check.py`로 노드와 용량을 검사하고, `model/previews/`에 미리보기 PNG를 남기고, `model/REPORT.md`를 한국어로 쓴다.
- 중간에 막히면 멈추지 말고 더 단순한 방법으로 끝까지 가고, 못 한 것은 REPORT.md에 적는다.
