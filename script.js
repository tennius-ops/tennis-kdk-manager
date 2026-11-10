// ========================================================
// 🎾 국밥툴즈 스타일 테니스 KDK 대진표 & 전적 매니저 스크립트
// ========================================================

// --- 전역 상태 ---
let currentTournament = null;
const STORAGE_KEY = 'tennis_kdk_saved_tournaments';

// 정수-문자 인덱스 (한울 AA용: 1~9, A=10, B=11, C=12, D=13, E=14, F=15, G=16)
const CHAR_MAP = '0123456789ABCDEFG';

// 정통 한울방식 게임 진행표 (AA) - 박현덕 님 원본
const HANUL_AA = {
  5: ["12:34", "13:25", "14:35", "15:24", "23:45"],
  6: ["12:34", "15:46", "23:56", "14:25", "24:36", "16:35"],
  7: ["12:34", "56:17", "35:24", "14:67", "23:57", "16:25", "46:37"],
  8: ["12:34", "56:78", "13:57", "24:68", "37:48", "15:26", "16:38", "25:47"],
  9: ["12:34", "56:78", "19:57", "23:68", "49:38", "15:26", "17:89", "36:45", "24:79"],
  10: ["12:34", "56:78", "23:6A", "19:58", "3A:45", "27:89", "4A:68", "13:79", "46:59", "17:2A"],
  11: ["12:34", "56:78", "1B:9A", "23:68", "4A:57", "26:9B", "13:5B", "49:8A", "17:28", "5A:6B", "39:47"],
  12: ["12:34", "56:78", "9A:BC", "37:48", "29:5A", "1B:6C", "13:57", "24:9B", "68:AC", "17:2B", "35:6A", "49:8C"],
  13: ["12:34", "56:78", "9A:BC", "1D:25", "37:4A", "68:9B", "CD:13", "26:5A", "47:8B", "9C:2D", "15:AB", "3C:67", "48:9D"],
  14: ["12:34", "56:78", "9A:BC", "DE:13", "24:57", "68:9B", "26:CD", "79:AE", "14:8B", "5E:6A", "3C:7B", "2D:89", "3E:45", "AC:1D"],
  15: ["12:34", "56:78", "9A:BC", "DE:1F", "23:57", "46:AB", "8D:9E", "4F:5C", "13:6B", "27:8A", "9C:5E", "36:DF", "1B:8C", "47:EF", "2A:9D"],
  16: ["12:34", "56:78", "9A:BC", "DE:FG", "13:57", "24:68", "9B:DF", "AC:EG", "15:9D", "37:BF", "26:AE", "48:CG", "19:2A", "5D:6E", "3B:4C", "7F:8G"]
};

// 정통 한울방식 혼합복식 진행표 (AB) - 남녀 / 1-2그룹
const HANUL_AB = {
  8: ["1A:2B", "3C:4D", "1B:3D", "2A:4C", "1C:4B", "2D:3A", "1D:4A", "3B:2C"],
  10: ["1A:2B", "3C:4D", "5E:1B", "2A:3D", "4C:5B", "1E:3A", "2D:4B", "3E:5C", "1D:4E", "2C:5A"],
  12: ["1A:2B", "3C:4D", "5E:6F", "1B:3D", "2A:5F", "4C:6E", "1C:5A", "3F:6B", "2D:4E", "3B:5C", "1D:4F", "2E:6A"],
  14: ["1A:2B", "3C:4D", "5E:6F", "7G:1B", "2A:3D", "4C:5F", "6E:7A", "1G:5C", "2D:4F", "3G:6B", "7E:2C", "1F:4A", "5G:3E", "6D:7B"],
  16: ["1A:2B", "3C:4D", "5E:6F", "7G:8H", "1B:3D", "2A:4C", "5F:7H", "6E:8G", "1D:4A", "2F:3G", "6B:7C", "5H:8E", "1G:5C", "2H:6D", "3E:7A", "4F:8B"]
};

// --- 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
  bindUiEvents();
  updatePlayerCountDisplay();
  updateSavedTourneyCount();
});

// --- UI 이벤트 바인딩 ---
function bindUiEvents() {
  // 1. 대진 방식 변경 (KDK vs 한울AA vs 한울AB)
  document.querySelectorAll('input[name="matchMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      onMethodChange(e.target.value);
    });
  });

  // 2. 1인당 경기 수 칩 버튼
  document.querySelectorAll('#gamesPerPlayerGroup .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#gamesPerPlayerGroup .chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 3. 실력별 그루핑 토글
  document.getElementById('toggleGrouping').addEventListener('change', (e) => {
    const isGrouped = e.target.checked;
    document.getElementById('rosterSingleWrap').classList.toggle('hidden', isGrouped);
    document.getElementById('rosterGroupedWrap').classList.toggle('hidden', !isGrouped);
    updatePlayerCountDisplay();
  });

  // 4. 참가자 명단 텍스트 변경 감지
  ['rosterTextarea', 'rosterHigh', 'rosterMid', 'rosterLow', 'rosterGroupA', 'rosterGroupB'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePlayerCountDisplay);
  });

  // 5. 예시 명단 버튼들
  document.getElementById('btnSample8').addEventListener('click', () => setSampleRoster(8));
  document.getElementById('btnSample10').addEventListener('click', () => setSampleRoster(10));
  document.getElementById('btnSample12').addEventListener('click', () => setSampleRoster(12));
  document.getElementById('btnClearRoster').addEventListener('click', () => {
    document.getElementById('rosterTextarea').value = '';
    updatePlayerCountDisplay();
  });

  // 6. 대진표 생성 및 다시 추첨
  document.getElementById('btnGenerate').addEventListener('click', () => generateSchedule(false));
  document.getElementById('btnReshuffle').addEventListener('click', () => generateSchedule(true));

  // 7. 처음으로 돌아가기 (설정 변경)
  document.getElementById('btnResetCurrent').addEventListener('click', () => {
    if (confirm('현재 경기 대진과 점수 입력 내용이 초기화돼요. 설정을 변경할까요?')) {
      document.getElementById('matchSection').classList.add('hidden');
      document.getElementById('setupSection').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // 8. 테스트용 점수 자동채우기
  document.getElementById('btnQuickFillDemo').addEventListener('click', quickFillRandomScores);

  // 9. 이번 대회 결과 저장
  document.getElementById('btnSaveTournament').addEventListener('click', saveCurrentTournament);

  // 10. 탭 전환 (대진표 vs 순위표)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const targetTab = btn.getAttribute('data-tab');
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // 11. 기록 & 누적 랭킹 모달
  const modal = document.getElementById('historyModal');
  document.getElementById('btnOpenHistory').addEventListener('click', () => {
    renderCumulativeRankings();
    renderSavedTournamentsList();
    modal.classList.remove('hidden');
  });

  document.getElementById('btnCloseHistory').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('btnConfirmCloseModal').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // 모달 내부 탭
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.modal-tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const paneId = btn.getAttribute('data-modaltab');
      document.getElementById(paneId).classList.add('active');
    });
  });

  // 히스토리 전체 삭제
  document.getElementById('btnClearAllHistory').addEventListener('click', () => {
    if (confirm('정말로 저장된 모든 대회 기록과 누적 전적을 영구 삭제할까요?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderCumulativeRankings();
      renderSavedTournamentsList();
      updateSavedTourneyCount();
      showToast('모든 기록이 삭제되었어요.');
    }
  });
}

// --- 대진 방식 변경 핸들러 ---
function onMethodChange(method) {
  // 라디오 카드 활성화 표시
  document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
  const activeRadio = document.querySelector(`input[name="matchMethod"][value="${method}"]`);
  if (activeRadio) activeRadio.closest('.method-card').classList.add('active');

  const badge = document.getElementById('methodBadge');
  const groupGames = document.getElementById('groupGamesPerPlayer');
  const kdkGroupingBox = document.getElementById('kdkGroupingBox');
  const rosterSingleWrap = document.getElementById('rosterSingleWrap');
  const rosterGroupedWrap = document.getElementById('rosterGroupedWrap');
  const rosterABWrap = document.getElementById('rosterABWrap');

  if (method === 'kdk') {
    badge.textContent = 'KDK 방식';
    groupGames.classList.remove('hidden');
    kdkGroupingBox.classList.remove('hidden');
    rosterABWrap.classList.add('hidden');

    const isGrouped = document.getElementById('toggleGrouping').checked;
    rosterSingleWrap.classList.toggle('hidden', isGrouped);
    rosterGroupedWrap.classList.toggle('hidden', !isGrouped);
  } else if (method === 'hanulAA') {
    badge.textContent = '한울 AA';
    groupGames.classList.remove('hidden');
    kdkGroupingBox.classList.add('hidden');
    rosterSingleWrap.classList.remove('hidden');
    rosterGroupedWrap.classList.add('hidden');
    rosterABWrap.classList.add('hidden');
  } else if (method === 'hanulAB') {
    badge.textContent = '한울 AB (혼복)';
    groupGames.classList.add('hidden'); // 한울 AB는 인원별로 게임수가 정해짐
    kdkGroupingBox.classList.add('hidden');
    rosterSingleWrap.classList.add('hidden');
    rosterGroupedWrap.classList.add('hidden');
    rosterABWrap.classList.remove('hidden');
  }

  updatePlayerCountDisplay();
}

// --- 숫자 스텝퍼 ---
function adjustCount(inputId, delta) {
  const input = document.getElementById(inputId);
  let val = parseInt(input.value, 10) || 0;
  val += delta;
  const min = parseInt(input.min, 10) || 1;
  const max = parseInt(input.max, 10) || 100;
  if (val >= min && val <= max) {
    input.value = val;
  }
}

// --- 문자열 파싱 유틸리티 ---
function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// --- 인원 수 실시간 카운트 표시 ---
function updatePlayerCountDisplay() {
  const method = document.querySelector('input[name="matchMethod"]:checked')?.value || 'kdk';

  if (method === 'hanulAB') {
    const listA = parseLines(document.getElementById('rosterGroupA').value);
    const listB = parseLines(document.getElementById('rosterGroupB').value);
    document.getElementById('countGroupA').textContent = listA.length;
    document.getElementById('countGroupB').textContent = listB.length;
  } else if (method === 'kdk' && document.getElementById('toggleGrouping').checked) {
    const h = parseLines(document.getElementById('rosterHigh').value).length;
    const m = parseLines(document.getElementById('rosterMid').value).length;
    const l = parseLines(document.getElementById('rosterLow').value).length;
    document.getElementById('countHigh').textContent = h;
    document.getElementById('countMid').textContent = m;
    document.getElementById('countLow').textContent = l;
  } else {
    const list = parseLines(document.getElementById('rosterTextarea').value);
    document.getElementById('singlePlayerCount').textContent = list.length;
  }
}

// 예시 명단 세팅
function setSampleRoster(count) {
  const baseNames = ['성원오빠', '홍영기', '김철수', '이영희', '박민수', '최지우', '정우성', '한소희', '오세훈', '윤아름', '강동원', '송혜교', '유재석', '손흥민', '이정재', '전지현'];
  const names = baseNames.slice(0, count);
  document.getElementById('rosterTextarea').value = names.join('\n');
  updatePlayerCountDisplay();
}

// --- 대진표 생성 메인 함수 ---
function generateSchedule(isReshuffle = false) {
  const method = document.querySelector('input[name="matchMethod"]:checked')?.value || 'kdk';
  const title = document.getElementById('tournamentTitle').value.trim() || '테니스 KDK 친선전';
  const courts = parseInt(document.getElementById('courtCount').value, 10) || 2;

  let activePlayers = []; // [{ id: 'p0', name: '...', level: 1|2|3 }]
  let gamesPerPlayer = 4;
  const activeChip = document.querySelector('#gamesPerPlayerGroup .chip-btn.active');
  if (activeChip) gamesPerPlayer = parseInt(activeChip.getAttribute('data-val'), 10) || 4;

  // 1. 선수 수집
  if (method === 'hanulAB') {
    const listA = parseLines(document.getElementById('rosterGroupA').value);
    const listB = parseLines(document.getElementById('rosterGroupB').value);
    if (listA.length !== listB.length) {
      alert(`한울 AB(혼복)는 두 그룹의 인원수가 같아야 해요!\n(현재: 그룹A ${listA.length}명, 그룹B ${listB.length}명)`);
      return;
    }
    const totalCount = listA.length + listB.length;
    if (!HANUL_AB[totalCount]) {
      alert(`한울 AB는 총 8명, 10명, 12명, 14명, 16명만 지원해요! (현재: ${totalCount}명)`);
      return;
    }
    listA.forEach((name, i) => activePlayers.push({ id: `pA_${i}`, name: name, group: 'A' }));
    listB.forEach((name, i) => activePlayers.push({ id: `pB_${i}`, name: name, group: 'B' }));
  } else if (method === 'kdk' && document.getElementById('toggleGrouping').checked) {
    const h = parseLines(document.getElementById('rosterHigh').value);
    const m = parseLines(document.getElementById('rosterMid').value);
    const l = parseLines(document.getElementById('rosterLow').value);
    let pIdx = 0;
    h.forEach(name => activePlayers.push({ id: `p${pIdx++}`, name: name, level: 3 }));
    m.forEach(name => activePlayers.push({ id: `p${pIdx++}`, name: name, level: 2 }));
    l.forEach(name => activePlayers.push({ id: `p${pIdx++}`, name: name, level: 1 }));

    if (activePlayers.length < 4) {
      alert('최소 4명 이상의 참가자를 입력해 주세요!');
      return;
    }
  } else {
    const list = parseLines(document.getElementById('rosterTextarea').value);
    if (list.length < 4) {
      alert('최소 4명 이상의 참가자를 입력해 주세요!');
      return;
    }
    if (method === 'hanulAA' && !HANUL_AA[list.length]) {
      alert(`한울 AA 방식은 5명부터 16명까지 지원해요! (현재: ${list.length}명)\n* 다른 인원수는 KDK 방식을 선택해 주세요.`);
      return;
    }
    list.forEach((name, i) => activePlayers.push({ id: `p${i}`, name: name }));
  }

  // 2. 대진 생성 (방식별)
  let matches = []; // [{ id, gameIndex, court, teamA: [p1, p2], teamB: [p3, p4], scoreA: null, scoreB: null, isFinished: false }]

  if (method === 'hanulAA') {
    matches = generateHanulAA(activePlayers, gamesPerPlayer, courts);
  } else if (method === 'hanulAB') {
    matches = generateHanulAB(activePlayers, courts);
  } else {
    // KDK 방식 (국밥툴즈 엔진 기반)
    matches = generateKdkMatches(activePlayers, gamesPerPlayer, courts);
  }

  if (!matches || matches.length === 0) {
    alert('대진표 생성에 실패했어요. 인원수나 설정을 확인해 주세요!');
    return;
  }

  // 3. 공평성 검산 (국밥툴즈 시그니처)
  const fairness = analyzeFairness(activePlayers, matches);

  // 4. 데이터 객체 생성
  currentTournament = {
    id: 'tourney_' + Date.now(),
    title: title,
    method: method,
    createdAt: new Date().toISOString(),
    playerCount: activePlayers.length,
    gamesPerPlayer: gamesPerPlayer,
    courts: courts,
    players: activePlayers,
    matches: matches,
    fairness: fairness,
  };

  // 5. 화면 전환 & 렌더링
  document.getElementById('setupSection').classList.add('hidden');
  document.getElementById('matchSection').classList.remove('hidden');

  document.getElementById('currentTournamentTitle').textContent = `🏆 ${title}`;
  document.getElementById('tournamentInfoMeta').textContent = 
    `방식: ${getMethodLabel(method)} | 참가자 ${activePlayers.length}명 | 총 ${matches.length}경기 | 코트 ${courts}면`;
  document.getElementById('rankingCountBadge').textContent = activePlayers.length;

  renderFairnessCard(fairness, activePlayers.length, matches.length, gamesPerPlayer);
  renderMatchesList(matches, courts);
  updateLiveRanking();

  // 대진표 탭 열기
  document.querySelector('.tab-btn[data-tab="tabMatches"]').click();

  if (isReshuffle) {
    showToast('새로운 대진으로 다시 추첨했어요! 🎲');
  } else {
    showToast('대진표가 멋지게 만들어졌어요! 🎾');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getMethodLabel(method) {
  if (method === 'hanulAA') return '한울 AA';
  if (method === 'hanulAB') return '한울 AB (혼복)';
  return 'KDK 방식';
}

// ========================================================
// 🏆 대진 생성 엔진들 (국밥툴즈 & 한울 공식 알고리즘)
// ========================================================

// 1. 한울 AA 생성기
function generateHanulAA(players, gamesPerPlayer, courts) {
  const n = players.length;
  const table = HANUL_AA[n];
  if (!table) return [];

  // 참가자 무작위 셔플 (순서 배정)
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

  // 8, 12, 16명의 경우 1인 3게임 옵션 지원
  let matchStrings = table;
  if ([8, 12, 16].includes(n) && gamesPerPlayer === 3) {
    const total3 = (n * 3) / 4;
    matchStrings = table.slice(0, total3);
  }

  return matchStrings.map((str, idx) => {
    // "12:34" 형태 파싱
    const [tA, tB] = str.split(':');
    const p1 = shuffledPlayers[CHAR_MAP.indexOf(tA[0]) - 1];
    const p2 = shuffledPlayers[CHAR_MAP.indexOf(tA[1]) - 1];
    const p3 = shuffledPlayers[CHAR_MAP.indexOf(tB[0]) - 1];
    const p4 = shuffledPlayers[CHAR_MAP.indexOf(tB[1]) - 1];

    const courtNum = (idx % courts) + 1;
    return {
      id: `match_${idx + 1}`,
      gameIndex: idx + 1,
      court: courtNum,
      teamA: [p1, p2],
      teamB: [p3, p4],
      scoreA: null,
      scoreB: null,
      isFinished: false,
    };
  });
}

// 2. 한울 AB 생성기 (혼합복식)
function generateHanulAB(players, courts) {
  const groupA = players.filter(p => p.group === 'A').sort(() => Math.random() - 0.5);
  const groupB = players.filter(p => p.group === 'B').sort(() => Math.random() - 0.5);
  const total = groupA.length + groupB.length;
  const table = HANUL_AB[total];
  if (!table) return [];

  return table.map((str, idx) => {
    // "1A:2B" 형태 파싱
    const [tA, tB] = str.split(':');
    const a1 = groupA[parseInt(tA[0], 10) - 1];
    const b1 = groupB[tA.charCodeAt(1) - 65]; // 'A'->0, 'B'->1

    const a2 = groupA[parseInt(tB[0], 10) - 1];
    const b2 = groupB[tB.charCodeAt(1) - 65];

    const courtNum = (idx % courts) + 1;
    return {
      id: `match_${idx + 1}`,
      gameIndex: idx + 1,
      court: courtNum,
      teamA: [a1, b1],
      teamB: [a2, b2],
      scoreA: null,
      scoreB: null,
      isFinished: false,
    };
  });
}

// 3. 국밥스타일 KDK 최적화 스케줄러 (임의 인원 & 실력별 그루핑)
function generateKdkMatches(players, gamesPerPlayer, courts) {
  const n = players.length;
  const totalGames = Math.round((n * gamesPerPlayer) / 4);
  if (totalGames < 1) return [];

  const playerIds = players.map(p => p.id);
  const playerMap = new Map(players.map(p => [p.id, p]));

  // 선수별 필요한 출전 횟수 계산
  const targetSlots = 4 * totalGames;
  const baseGames = Math.floor(targetSlots / n);
  const extraCount = targetSlots % n;

  let bestSchedule = null;
  let minPenalty = Infinity;

  // 150번의 몬테카를로 탐욕 시뮬레이션을 통해 가장 공평한 대진 추출
  const ATTEMPTS = 150;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const quota = new Map();
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);
    playerIds.forEach(id => quota.set(id, baseGames));
    shuffledOrder.slice(0, extraCount).forEach(id => quota.set(id, baseGames + 1));

    const partnerCounts = new Map();
    const opponentCounts = new Map();
    const pairKey = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;

    const trialMatches = [];
    let possible = true;

    for (let g = 0; g < totalGames; g++) {
      // 쿼터가 남아있는 선수들
      const available = playerIds.filter(id => (quota.get(id) || 0) > 0);
      if (available.length < 4) {
        possible = false;
        break;
      }

      let bestSplit = null;
      let minGamePenalty = Infinity;
      let best4 = null;

      // 4명 후보군을 여러 번 샘플링
      for (let s = 0; s < 10; s++) {
        const pool = [...available].sort(() => Math.random() - 0.5);
        pool.sort((a, b) => (quota.get(b) || 0) - (quota.get(a) || 0));
        const four = pool.slice(0, 4);

        // 4명을 2:2로 나누는 3가지 분할
        const splits = [
          { a: [four[0], four[1]], b: [four[2], four[3]] },
          { a: [four[0], four[2]], b: [four[1], four[3]] },
          { a: [four[0], four[3]], b: [four[1], four[2]] },
        ];

        for (const sp of splits) {
          const pA = partnerCounts.get(pairKey(sp.a[0], sp.a[1])) || 0;
          const pB = partnerCounts.get(pairKey(sp.b[0], sp.b[1])) || 0;

          let opp = 0;
          for (const x of sp.a) {
            for (const y of sp.b) {
              opp += opponentCounts.get(pairKey(x, y)) || 0;
            }
          }

          // 실력별 그루핑 페널티
          let levelPen = 0;
          const pObj = id => playerMap.get(id);
          if (pObj(four[0])?.level) {
            // 상급자끼리 묶임 페널티
            const isHigh = id => pObj(id).level === 3;
            if (isHigh(sp.a[0]) && isHigh(sp.a[1])) levelPen += 800;
            if (isHigh(sp.b[0]) && isHigh(sp.b[1])) levelPen += 800;

            // 팀 간 실력차 제곱 페널티
            const sumA = (pObj(sp.a[0]).level || 2) + (pObj(sp.a[1]).level || 2);
            const sumB = (pObj(sp.b[0]).level || 2) + (pObj(sp.b[1]).level || 2);
            levelPen += Math.abs(sumA - sumB) * 150;
          }

          const pen = (pA + pB) * 1000 + opp * 5 + levelPen;
          if (pen < minGamePenalty) {
            minGamePenalty = pen;
            bestSplit = sp;
            best4 = four;
          }
        }
      }

      if (!bestSplit) {
        possible = false;
        break;
      }

      // 쿼터 차감 및 매트릭스 갱신
      best4.forEach(id => quota.set(id, (quota.get(id) || 1) - 1));
      const kA = pairKey(bestSplit.a[0], bestSplit.a[1]);
      const kB = pairKey(bestSplit.b[0], bestSplit.b[1]);
      partnerCounts.set(kA, (partnerCounts.get(kA) || 0) + 1);
      partnerCounts.set(kB, (partnerCounts.get(kB) || 0) + 1);

      for (const x of bestSplit.a) {
        for (const y of bestSplit.b) {
          const ko = pairKey(x, y);
          opponentCounts.set(ko, (opponentCounts.get(ko) || 0) + 1);
        }
      }

      const courtNum = (g % courts) + 1;
      trialMatches.push({
        id: `match_${g + 1}`,
        gameIndex: g + 1,
        court: courtNum,
        teamA: [playerMap.get(bestSplit.a[0]), playerMap.get(bestSplit.a[1])],
        teamB: [playerMap.get(bestSplit.b[0]), playerMap.get(bestSplit.b[1])],
        scoreA: null,
        scoreB: null,
        isFinished: false,
      });
    }

    if (possible && trialMatches.length === totalGames) {
      const f = analyzeFairness(players, trialMatches);
      const totalScore = f.partnerRepeats * 2000 + (f.maxGames - f.minGames) * 500 + f.opponentImbalance;
      if (totalScore < minPenalty) {
        minPenalty = totalScore;
        bestSchedule = trialMatches;
        if (totalScore === 0) break; // 완벽한 대진표면 즉시 종료
      }
    }
  }

  return bestSchedule || [];
}

// ========================================================
// 📊 국밥툴즈 공평성 검산 (analyzeFairness)
// ========================================================
function analyzeFairness(players, matches) {
  const gamesCount = {};
  const partnerCounts = new Map();
  const opponentCounts = new Map();
  const pairKey = (a, b) => a < b ? `${a}_${b}` : `${b}_${a}`;

  players.forEach(p => { gamesCount[p.id] = 0; });

  matches.forEach(m => {
    [...m.teamA, ...m.teamB].forEach(p => {
      if (gamesCount[p.id] !== undefined) gamesCount[p.id]++;
    });

    const kA = pairKey(m.teamA[0].id, m.teamA[1].id);
    const kB = pairKey(m.teamB[0].id, m.teamB[1].id);
    partnerCounts.set(kA, (partnerCounts.get(kA) || 0) + 1);
    partnerCounts.set(kB, (partnerCounts.get(kB) || 0) + 1);

    for (const a of m.teamA) {
      for (const b of m.teamB) {
        const ko = pairKey(a.id, b.id);
        opponentCounts.set(ko, (opponentCounts.get(ko) || 0) + 1);
      }
    }
  });

  const counts = Object.values(gamesCount);
  const minG = counts.length ? Math.min(...counts) : 0;
  const maxG = counts.length ? Math.max(...counts) : 0;

  let partnerRepeats = 0;
  for (const c of partnerCounts.values()) {
    if (c > 1) partnerRepeats += (c - 1);
  }

  const oppArr = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const k = pairKey(players[i].id, players[j].id);
      oppArr.push(opponentCounts.get(k) || 0);
    }
  }

  const oppMin = oppArr.length ? Math.min(...oppArr) : 0;
  const oppMax = oppArr.length ? Math.max(...oppArr) : 0;
  const oppAvg = oppArr.reduce((a, b) => a + b, 0) / (oppArr.length || 1);
  const oppImbalance = oppArr.reduce((acc, v) => acc + (v - oppAvg) ** 2, 0);

  return {
    isEven: minG === maxG,
    minGames: minG,
    maxGames: maxG,
    partnerRepeats: partnerRepeats,
    oppMin: oppMin,
    oppMax: oppMax,
    opponentImbalance: oppImbalance,
  };
}

// 공평성 검산 카드 렌더링
function renderFairnessCard(fairness, playerCount, totalGames, targetG) {
  const badge = document.getElementById('fairnessBadge');
  if (fairness.isEven && fairness.partnerRepeats === 0) {
    badge.className = 'fairness-status-badge';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> 경기수·파트너 공평';
  } else if (fairness.isEven) {
    badge.className = 'fairness-status-badge';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> 전원 동일 경기수';
  } else {
    badge.className = 'fairness-status-badge warning';
    badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> 경기수 1회 편차';
  }

  document.getElementById('statGamesPerPlayer').textContent = 
    fairness.isEven ? `${fairness.minGames}경기` : `${fairness.minGames}~${fairness.maxGames}경기`;
  document.getElementById('statTotalGames').textContent = `${totalGames}경기`;
  document.getElementById('statPartnerRepeats').textContent = 
    fairness.partnerRepeats === 0 ? '0쌍 (전원 다름)' : `${fairness.partnerRepeats}쌍 중복`;
  document.getElementById('statOpponentSpread').textContent = 
    `${fairness.oppMin}~${fairness.oppMax}회 균등`;
}

// ========================================================
// 🏟️ 대진표 경기 카드 렌더링 (코트 수별 회차 그룹화)
// ========================================================
function renderMatchesList(matches, courts) {
  const container = document.getElementById('matchesContainer');
  container.innerHTML = '';

  // 코트 수 단위로 회차(시간대) 묶기
  const timeSlots = [];
  for (let i = 0; i < matches.length; i += courts) {
    timeSlots.push(matches.slice(i, i + courts));
  }

  timeSlots.forEach((slot, sIdx) => {
    const roundBlock = document.createElement('div');
    roundBlock.className = 'round-time-block';

    // 해당 시간대에 쉬는 선수 파악
    const playingIds = new Set(slot.flatMap(m => [...m.teamA, ...m.teamB].map(p => p.id)));
    const resting = currentTournament.players.filter(p => !playingIds.has(p.id));
    let restingHtml = '';
    if (resting.length > 0) {
      const restNames = resting.map(p => p.name).join(', ');
      restingHtml = `<span class="resting-badge"><i class="fa-solid fa-mug-hot"></i> 대기(휴식): ${escapeHtml(restNames)}</span>`;
    }

    roundBlock.innerHTML = `
      <div class="round-time-header">
        <h3><i class="fa-solid fa-clock"></i> ${sIdx + 1}회차 경기 (${slot.length}개 코트 동시 진행)</h3>
        ${restingHtml}
      </div>
      <div class="matches-grid" id="grid_slot_${sIdx}"></div>
    `;

    container.appendChild(roundBlock);

    const grid = roundBlock.querySelector(`#grid_slot_${sIdx}`);
    slot.forEach(m => {
      grid.appendChild(createMatchCard(m));
    });
  });
}

// 개별 경기 카드 생성
function createMatchCard(m) {
  const card = document.createElement('div');
  card.className = `match-card ${m.isFinished ? 'finished' : ''}`;
  card.id = `card_${m.id}`;

  const formatTeam = team => {
    return team.map(p => {
      const badge = p.level === 3 ? '<span class="level-badge high">상</span>' :
                    p.level === 2 ? '<span class="level-badge mid">중</span>' :
                    p.level === 1 ? '<span class="level-badge low">하</span>' : '';
      return `${badge}${escapeHtml(p.name)}`;
    }).join(' · ');
  };

  const isAWin = m.isFinished && m.scoreA > m.scoreB;
  const isBWin = m.isFinished && m.scoreB > m.scoreA;

  card.innerHTML = `
    <div class="match-top-meta">
      <span class="game-num-tag">${m.gameIndex}경기</span>
      <span class="court-tag court-${m.court}">코트 ${m.court}</span>
    </div>
    <div class="teams-wrapper">
      
      <!-- A팀 -->
      <div class="team-row ${isAWin ? 'winner' : ''}" id="rowA_${m.id}">
        <div class="team-names">
          <span class="team-label">A팀</span>
          <span class="player-names-text">${formatTeam(m.teamA)}</span>
        </div>
        <div class="score-box">
          <input type="number" min="0" max="99" class="score-input"
                 id="scoreA_${m.id}"
                 value="${m.scoreA !== null ? m.scoreA : ''}"
                 placeholder="0"
                 onchange="onScoreChange('${m.id}')">
        </div>
      </div>

      <div class="vs-divider">VS</div>

      <!-- B팀 -->
      <div class="team-row ${isBWin ? 'winner' : ''}" id="rowB_${m.id}">
        <div class="team-names">
          <span class="team-label">B팀</span>
          <span class="player-names-text">${formatTeam(m.teamB)}</span>
        </div>
        <div class="score-box">
          <input type="number" min="0" max="99" class="score-input"
                 id="scoreB_${m.id}"
                 value="${m.scoreB !== null ? m.scoreB : ''}"
                 placeholder="0"
                 onchange="onScoreChange('${m.id}')">
        </div>
      </div>

    </div>
  `;

  return card;
}

// 점수 변경 핸들러
function onScoreChange(matchId) {
  const inpA = document.getElementById(`scoreA_${matchId}`);
  const inpB = document.getElementById(`scoreB_${matchId}`);
  const valA = inpA.value.trim();
  const valB = inpB.value.trim();

  const match = currentTournament.matches.find(m => m.id === matchId);
  if (!match) return;

  const card = document.getElementById(`card_${matchId}`);
  const rowA = document.getElementById(`rowA_${matchId}`);
  const rowB = document.getElementById(`rowB_${matchId}`);

  if (valA !== '' && valB !== '') {
    const numA = parseInt(valA, 10);
    const numB = parseInt(valB, 10);
    match.scoreA = numA;
    match.scoreB = numB;
    match.isFinished = true;

    card.classList.add('finished');
    rowA.classList.toggle('winner', numA > numB);
    rowB.classList.toggle('winner', numB > numA);
  } else {
    match.scoreA = valA !== '' ? parseInt(valA, 10) : null;
    match.scoreB = valB !== '' ? parseInt(valB, 10) : null;
    match.isFinished = false;

    card.classList.remove('finished');
    rowA.classList.remove('winner');
    rowB.classList.remove('winner');
  }

  updateLiveRanking();
}

// ========================================================
// 📈 실시간 순위표 & 국밥툴즈 승점 동률 규칙 계산
// ========================================================
function calculateStandings(tournament) {
  const map = new Map();
  tournament.players.forEach(p => {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      goalDiff: 0,
      winRate: 0,
    });
  });

  tournament.matches.forEach(m => {
    if (m.isFinished && m.scoreA !== null && m.scoreB !== null) {
      const sA = m.scoreA;
      const sB = m.scoreB;

      m.teamA.forEach(p => {
        const st = map.get(p.id);
        if (st) {
          st.played++;
          st.scoreFor += sA;
          st.scoreAgainst += sB;
          if (sA > sB) st.wins++;
          else if (sA < sB) st.losses++;
          else st.draws++;
        }
      });

      m.teamB.forEach(p => {
        const st = map.get(p.id);
        if (st) {
          st.played++;
          st.scoreFor += sB;
          st.scoreAgainst += sA;
          if (sB > sA) st.wins++;
          else if (sB < sA) st.losses++;
          else st.draws++;
        }
      });
    }
  });

  const list = [...map.values()];
  list.forEach(st => {
    st.goalDiff = st.scoreFor - st.scoreAgainst;
    st.winRate = st.played > 0 ? ((st.wins / st.played) * 100).toFixed(1) : 0;
  });

  // 정렬 순위: 1) 승리 수 -> 2) 득실차 -> 3) 다득점 -> 4) 승률 -> 5) 이름 가나다
  list.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.name.localeCompare(b.name, 'ko');
  });

  return list;
}

function updateLiveRanking() {
  if (!currentTournament) return;
  const standings = calculateStandings(currentTournament);
  const tbody = document.getElementById('rankingTableBody');
  tbody.innerHTML = '';

  standings.forEach((st, idx) => {
    const rank = idx + 1;
    let rankBadge = `<span class="rank-badge">${rank}</span>`;
    if (rank === 1) rankBadge = `<span class="rank-badge rank-1">🥇 1</span>`;
    else if (rank === 2) rankBadge = `<span class="rank-badge rank-2">🥈 2</span>`;
    else if (rank === 3) rankBadge = `<span class="rank-badge rank-3">🥉 3</span>`;

    const diffClass = st.goalDiff > 0 ? 'diff-positive' : (st.goalDiff < 0 ? 'diff-negative' : '');
    const diffSign = st.goalDiff > 0 ? `+${st.goalDiff}` : `${st.goalDiff}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td class="player-name-cell">${escapeHtml(st.name)}</td>
      <td>${st.played}</td>
      <td class="win-cell">${st.wins}승</td>
      <td>${st.losses}패</td>
      <td>${st.scoreFor}</td>
      <td>${st.scoreAgainst}</td>
      <td class="${diffClass}">${diffSign}</td>
      <td><strong>${st.winRate}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// 점수 자동채우기 (테스트 편의용)
function quickFillRandomScores() {
  if (!currentTournament) return;
  const scorePairs = [
    [6, 4], [6, 2], [6, 3], [4, 6], [2, 6], [6, 5], [5, 6], [6, 1], [3, 6]
  ];

  currentTournament.matches.forEach(m => {
    const pair = scorePairs[Math.floor(Math.random() * scorePairs.length)];
    m.scoreA = pair[0];
    m.scoreB = pair[1];
    m.isFinished = true;

    const inpA = document.getElementById(`scoreA_${m.id}`);
    const inpB = document.getElementById(`scoreB_${m.id}`);
    if (inpA && inpB) {
      inpA.value = pair[0];
      inpB.value = pair[1];
    }

    const card = document.getElementById(`card_${m.id}`);
    if (card) {
      card.classList.add('finished');
      const rowA = document.getElementById(`rowA_${m.id}`);
      const rowB = document.getElementById(`rowB_${m.id}`);
      rowA.classList.toggle('winner', pair[0] > pair[1]);
      rowB.classList.toggle('winner', pair[1] > pair[0]);
    }
  });

  updateLiveRanking();
  showToast('모든 경기에 테스트 점수를 입력했어요! 순위표에서 확인해보세요 😊');
}

// ========================================================
// 💾 대회 결과 로컬 저장 & 누적 전적 통계 (명예의 전당)
// ========================================================
function saveCurrentTournament() {
  if (!currentTournament) return;

  const savedList = getSavedTournaments();
  const finalRankings = calculateStandings(currentTournament);
  const record = {
    ...currentTournament,
    finalRankings: finalRankings,
    savedAt: new Date().toISOString(),
  };

  const existingIdx = savedList.findIndex(t => t.id === record.id);
  if (existingIdx >= 0) {
    savedList[existingIdx] = record;
  } else {
    savedList.unshift(record);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedList));
  updateSavedTourneyCount();
  showToast('🎉 이번 대회가 안전하게 저장되었어요! 누적 승리 랭킹에 반영되었습니다.');
}

function getSavedTournaments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function updateSavedTourneyCount() {
  const count = getSavedTournaments().length;
  const badge = document.getElementById('savedTourneysCount');
  if (badge) badge.textContent = count;
}

// 누적 승리 수 랭킹 (Hall of Fame)
function renderCumulativeRankings() {
  const savedTourneys = getSavedTournaments();
  const tbody = document.getElementById('totalRankingTableBody');
  tbody.innerHTML = '';

  if (savedTourneys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding: 30px; color: #9ca3af;">저장된 대회가 아직 없어요.<br>대회 결과를 저장하면 누적 승리 랭킹이 표시돼요!</td></tr>`;
    return;
  }

  const map = {};
  savedTourneys.forEach(t => {
    const rankings = t.finalRankings || calculateStandings(t);
    rankings.forEach(st => {
      const name = st.name.trim();
      if (!map[name]) {
        map[name] = {
          name: name,
          tourneys: 0,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          scoreFor: 0,
          scoreAgainst: 0,
        };
      }
      map[name].tourneys++;
      map[name].played += st.played;
      map[name].wins += st.wins;
      map[name].losses += st.losses;
      map[name].draws += (st.draws || 0);
      map[name].scoreFor += st.scoreFor;
      map[name].scoreAgainst += st.scoreAgainst;
    });
  });

  const list = Object.values(map);
  list.forEach(p => {
    p.goalDiff = p.scoreFor - p.scoreAgainst;
    p.winRate = p.played > 0 ? ((p.wins / p.played) * 100).toFixed(1) : 0;
  });

  // 누적 승리 수 기준 정렬
  list.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.winRate - a.winRate;
  });

  list.forEach((p, idx) => {
    const rank = idx + 1;
    let rankBadge = `<span class="rank-badge">${rank}</span>`;
    if (rank === 1) rankBadge = `<span class="rank-badge rank-1">👑 1</span>`;
    else if (rank === 2) rankBadge = `<span class="rank-badge rank-2">🥈 2</span>`;
    else if (rank === 3) rankBadge = `<span class="rank-badge rank-3">🥉 3</span>`;

    const diffClass = p.goalDiff > 0 ? 'diff-positive' : (p.goalDiff < 0 ? 'diff-negative' : '');
    const diffSign = p.goalDiff > 0 ? `+${p.goalDiff}` : `${p.goalDiff}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td class="player-name-cell">${escapeHtml(p.name)}</td>
      <td>${p.tourneys}회</td>
      <td>${p.played}경기</td>
      <td class="win-cell" style="font-size: 1.05rem;"><strong>${p.wins}승</strong></td>
      <td>${p.losses}패</td>
      <td class="${diffClass}">${diffSign}</td>
      <td><strong>${p.winRate}%</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// 저장된 대회 목록 렌더링
function renderSavedTournamentsList() {
  const container = document.getElementById('savedTournamentList');
  container.innerHTML = '';
  const list = getSavedTournaments();

  if (list.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 30px;">저장된 대회가 없어요.</p>`;
    return;
  }

  list.forEach(t => {
    const dateStr = new Date(t.savedAt || t.createdAt).toLocaleString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const topWinner = t.finalRankings && t.finalRankings[0] ? t.finalRankings[0].name : '없음';
    const topWins = t.finalRankings && t.finalRankings[0] ? t.finalRankings[0].wins : 0;

    const item = document.createElement('div');
    item.className = 'tourney-item-card';
    item.innerHTML = `
      <div class="tourney-item-header">
        <span class="tourney-item-title">🏆 ${escapeHtml(t.title)} (${getMethodLabel(t.method)})</span>
        <span class="tourney-date">${dateStr}</span>
      </div>
      <div class="tourney-item-body">
        <div>
          <span>인원: ${t.playerCount}명 | 총 ${t.matches?.length || 0}경기</span>
          &nbsp;&bull;&nbsp;
          <span class="top-winner-tag">🥇 1위: ${escapeHtml(topWinner)} (${topWins}승)</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-outline" onclick="loadSavedTournament('${t.id}')">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> 불러오기
          </button>
          <button class="btn btn-sm btn-outline danger" onclick="deleteSavedTournament('${t.id}')">
            <i class="fa-solid fa-trash"></i> 삭제
          </button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// 불러오기
function loadSavedTournament(tourneyId) {
  const list = getSavedTournaments();
  const target = list.find(t => t.id === tourneyId);
  if (!target) return;

  currentTournament = target;

  document.getElementById('setupSection').classList.add('hidden');
  document.getElementById('matchSection').classList.remove('hidden');

  document.getElementById('currentTournamentTitle').textContent = `🏆 ${target.title}`;
  document.getElementById('tournamentInfoMeta').textContent = 
    `방식: ${getMethodLabel(target.method)} | 참가자 ${target.playerCount}명 | 총 ${target.matches.length}경기 | 저장된 대회 열람 중`;

  document.getElementById('rankingCountBadge').textContent = target.playerCount;

  renderFairnessCard(target.fairness || analyzeFairness(target.players, target.matches), target.playerCount, target.matches.length, target.gamesPerPlayer || 4);
  renderMatchesList(target.matches, target.courts || 2);
  updateLiveRanking();

  document.getElementById('historyModal').classList.add('hidden');
  showToast(`'${target.title}' 대회를 불러왔어요!`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 삭제
function deleteSavedTournament(tourneyId) {
  if (!confirm('이 대회를 기록에서 삭제할까요?')) return;
  let list = getSavedTournaments();
  list = list.filter(t => t.id !== tourneyId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  renderCumulativeRankings();
  renderSavedTournamentsList();
  updateSavedTourneyCount();
  showToast('대회가 삭제되었어요.');
}

// 토스트 표시
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// HTML 이스케이프
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
