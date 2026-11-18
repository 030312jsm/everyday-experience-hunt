# mori 3D 모델 제작 보고서

Blender 5.3.0 백그라운드에서 가게, 병, 병 속 내용물을 제작했다. 최종 GLB 세 개를 다시 불러와 검사했고, 동일한 스크립트로 재생성한 세 파일은 각각 첫 결과와 SHA-256 해시가 일치했다.

## 납품 파일과 예산

| 파일 | 노드 | 파일 크기 | 삼각형 | 요구서 한도 | 검사 |
|---|---:|---:|---:|---|---|
| `assets/models/shop.glb` | 40 | 3,930,232 B | 69,908 | 15 MB, 400,000삼각형 | 통과 |
| `assets/models/jar.glb` | 3 | 182,420 B | 4,612 | 1 MB, 5,000삼각형 | 통과 |
| `assets/models/contents.glb` | 34 | 2,011,396 B | 66,629 | 5 MB | 통과 |

삼각형 수는 GLB에 실제 기록된 인덱스를 기준으로 집계했다. 병 한 개의 수치는 선반 인스턴싱 전 기준이다. 내장 이미지는 모두 JPEG이고 가장 큰 이미지는 1024 × 1024다. 텍스처는 고정 시드로 색·노멀·젖은 길의 거칠기를 이미지에 구워 Principled BSDF에 연결했다. 세 파일 모두 미터 단위, glTF +Y Up이며 Draco 압축을 사용하지 않았다.

## 가게와 골목

13.5cm 폭의 오크 판재에 서로 어긋나는 끝 이음매를 냈다. 실내에는 회벽, 징두리판과 걸레받이, 천장 보 세 개를 배치했다. 가게 정면에는 층을 낸 처마, 짙은 녹색 기둥과 황동 몰딩, 돌 창대, 토분 두 개를 두었다. 창을 통해 실내가 보인다. 문짝에는 호박색으로 빛나는 세로 유리 틈이 있고, 왼쪽 경첩을 중심으로 회전한다. 외부에는 낙수관, 위층 창, 돌 연석과 젖은 아스팔트, 건너편 건물과 가로등 두 개를 배치했다.

원형 테라조 상판에는 관통 구멍 여섯 개가 있다. 각 홈은 안쪽 벽과 황동 테로 구성하고 홈 바닥을 열어 두었다. 카운터 몸통의 상부 덮개는 높이 0.83m에 있다. 선반은 20칸 × 7단이며 아래 수납장에 손잡이를 달았다. 뒤판은 코드의 불빛 판을 위해 비웠다.

| 구성 | GLB 노드 이름 |
|---|---|
| 실내 | `room_floor`, `room_walls`, `room_ceiling`, `wall_details` |
| 정면 | `facade`, `window_frame`, `window_glass`, `door`, `door_slit`, `door_knob`, `sign_plate` |
| 거리 | `street`, `curb`, `alley` |
| 카운터 | `counter`, `counter_led`, `counter_center` |
| 홈 | `well_0`, `well_1`, `well_2`, `well_3`, `well_4`, `well_5` |
| 병 받침 | `dock_0`, `dock_1`, `dock_2`, `dock_3`, `dock_4`, `dock_5` |
| 의자 | `stool_0`, `stool_1`, `stool_2`, `stool_3`, `stool_4`, `stool_5` |
| 선반과 등 | `shelf`, `pendant_0`, `pendant_1`, `pendant_2`, `pendant_3` |

`door_slit`과 `door_knob`은 `door`의 자식이다. 포스터 세 자리와 선반 앞, 출입 동선에는 추가 장식을 두지 않았다. 통로 및 중앙 여유 공간과 요구서의 고정 가구가 겹치는 부분은 지정된 카운터와 의자 위치를 우선했다.

## 병과 내용물

`jar_glass`는 밑면을 포함해 안팎이 연결된 유리 셸이다. 투과율 1, 거칠기 0.03, 굴절률 1.48을 사용했다. `jar_cork`에는 코르크 입자 텍스처를 입혔고, `jar_twine`에는 두 가닥이 꼬인 끈을 목 둘레에 두 번 감고 매듭을 냈다. 병을 인스턴싱할 수 있도록 세 노드는 각각 단일 메시와 단일 재질을 쓴다.

| 빈 부모 노드 | 자식 노드의 실제 저장 순서 |
|---|---|
| `k1_wave` | `sand_col`, `sand_top`, `water_side`, `water_top`, `foam` |
| `k2_blanket` | `cloth_0`, `cloth_1`, `cloth_2` |
| `k3_cloud` | `puff_0`, `puff_1`, `puff_2`, `puff_3`, `puff_4`, `puff_5`, `puff_6`, `puff_7`, `puff_8`, `puff_9` |
| `k4_moss` | `soil_col`, `soil_top`, `mound`, `moss_ball_0`, `moss_ball_1`, `stone_2`, `stone_3`, `stone_4` |
| `k5_moon` | `moon_side`, `moon_top`, `moon_edge` |

파도의 모래와 수면에는 별도의 기복을 주고, 가장자리에는 크기가 다른 거품을 둘렀다. 이불은 서로 다른 방향으로 접힌 니트 세 겹이다. 구름의 가는 섬유, 흙 단면의 뿌리와 자갈, 이끼의 새순과 포자대는 메시로 만들었다. 달빛 수면은 중심을 살짝 비껴난 한 점에서 동심원이 번진다.

## 재현 및 검사

저장소 루트에서 다음 PowerShell 명령을 실행한다. 임시 파일과 텍스처는 `model/tmp/`를 사용한다.

```powershell
$blender = 'C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe'
$env:TEMP = (Resolve-Path model/tmp).Path
$env:TMP = $env:TEMP
foreach ($script in 'build_shop', 'build_jar', 'build_contents', 'check', 'preview') {
    & $blender -b --python-exit-code 1 -P "model/src/$script.py"
    if ($LASTEXITCODE -ne 0) { throw "$script failed" }
}
```

`model/src/check.py`는 파일과 삼각형 예산, 노드 이름과 개수, 내용물 자식 순서, 내장 이미지 형식과 해상도를 확인한다. Blender 재수입 후 문 경첩과 자식 관계, 문짝 치수, 홈·도크 위치와 의자 높이를 대조한다. 각 홈에 수직 광선 아홉 개를 통과시켜 높이 0.84m까지 막힘이 없는지 검사한다. 유리 셸의 닫힘과 내용물의 반지름 0.066m 경계도 검사했다.

## Eevee 미리보기

| 화면 | PNG |
|---|---|
| 길에서 본 정면 | [01_front.png](previews/01_front.png) |
| 문 안쪽에서 본 카운터 | [02_counter.png](previews/02_counter.png) |
| 선반 앞 | [03_shelf.png](previews/03_shelf.png) |
| 유리병 근접 | [04_jar.png](previews/04_jar.png) |
| 내용물 다섯 종류 | [05_contents.png](previews/05_contents.png) |

세 가게 뷰에는 요구서의 카메라 위치와 주시점, 세로 시야각 40°를 적용했다. 미리보기 전용 장면에 조명, 간판 글씨, 선반 뒤 불빛, 재고 병 140개와 임시 내용물·꼬리표를 배치했다.

## 웹 연결 시 확인할 점

- 요구서에 따른 맨 아래 선반의 **윗면은 0.450m**다. 기존 `store.js`의 병 바닥 계산은 0.463m이므로 새 선반에 얹을 때 병 배치 높이에 13mm 차이가 있다.
- `jar_cork`의 로컬 원점은 마개 중심이다. 병 전체를 읽으면 마개의 y 이동 0.212m가 이미 적용되어 있다. 부품만 인스턴싱하는 경우 이 이동은 한 번만 적용한다.
- 여러 재질을 쓴 노드는 GLTFLoader에서 하위 메시로 나뉠 수 있다. 내용물 애니메이션은 빈 부모의 직접 자식 순서를 사용하고, 재질을 바꿀 때는 해당 자식 안의 메시를 순회한다.
- 실제 웹 장면에 로딩한 뒤의 투과·블룸·홈 셰이더와 모바일 성능은 이번 작업에서 검증하지 않았다. PNG는 Eevee 결과이며 사이트 연결은 후속 작업이다.

