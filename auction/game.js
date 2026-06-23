// ==========================================
// 2. プレイヤークラス
// ==========================================
class Player {
    constructor(id, name, initialBudget) {
        this.id = id;
        this.name = name;
        this.budget = initialBudget;
        this.currentBid = 0;
        this.inventory = []; 
        this.hasUsedItemThisRound = false; 
        this.fakeBidAmount = null; // ★偽装入札用のデータ

        // 自分だけが知っているアイテム情報をメモしておく場所
        this.knownItems = [];
    }

    bid(amount) {
        this.currentBid = amount;
    }
}















// ==========================================
// 3. 箱（コンテナ）クラス
// ==========================================
class StorageBox {
    constructor(boxName) {
        this.name = boxName;
        this.items = [];            
        this.totalActualValue = 0;  
        
        // ★新設：箱の広さを定義（例：タテ5マス × ヨコ5マス）
        this.gridWidth = 7;
        this.gridHeight = 8;
        
        // ★新設：マスの空き状況を管理する表（0なら空きマス、1なら配置済みマス）を作成
        this.grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(0));

        this.packItems();
        this.initialHint = this.createHint(); 
    }

    packItems() {
        // ★今回の箱に入れる「目標のアイテム数」をランダムに決定
        const targetItemCount = Math.floor(Math.random() * (MAX_ITEMS_PER_BOX - MIN_ITEMS_PER_BOX + 1)) + MIN_ITEMS_PER_BOX;
        
        const totalWeight = ITEM_DATABASE.reduce((sum, item) => sum + item.weight, 0);

        let attempts = 0;
        const maxAttempts = 50; // 箱がパンパンで入らない時の無限ループ防止用（安全装置）

        // ★目標の個数に達するか、上限回数に達するまで配置を繰り返す
        while (this.items.length < targetItemCount && attempts < maxAttempts) {
            attempts++;

            // 1. アイテムの抽選
            let randomNum = Math.random() * totalWeight;
            let selectedBaseItem = null;

            for (let item of ITEM_DATABASE) {
                if (randomNum < item.weight) {
                    selectedBaseItem = item;
                    break;
                }
                randomNum -= item.weight;
            }

            // 2. 箱の左上から順番に、アイテムを置ける空きスペースを探す
            let isPlaced = false;
            
            for (let y = 0; y <= this.gridHeight - selectedBaseItem.h; y++) {
                for (let x = 0; x <= this.gridWidth - selectedBaseItem.w; x++) {
                    
                    if (this.canPlaceItem(x, y, selectedBaseItem.w, selectedBaseItem.h)) {
                        this.fillGrid(x, y, selectedBaseItem.w, selectedBaseItem.h);
                        
                        const rarityInfo = RARITY_CONFIG[selectedBaseItem.rarity];
                        
                        this.items.push({
                            name: selectedBaseItem.name,
                            value: selectedBaseItem.value,
                            rarity: rarityInfo.label,
                            w: selectedBaseItem.w,
                            h: selectedBaseItem.h,
                            x: x, 
                            y: y
                        });
                        
                        this.totalActualValue += selectedBaseItem.value;
                        isPlaced = true;
                        break; // X方向の探索を終了
                    }
                }
                if (isPlaced) break; // Y方向の探索も終了して、次の抽選へ
            }
        }
    }

    // 指定した座標にアイテムが置けるか（他のアイテムと重ならないか）をチェックする処理
    canPlaceItem(startX, startY, w, h) {
        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) {
                if (this.grid[y][x] === 1) {
                    return false; // すでに何かが置かれている場合はNG
                }
            }
        }
        return true;
    }

    // マスを「配置済み(1)」に更新する処理
    fillGrid(startX, startY, w, h) {
        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) {
                this.grid[y][x] = 1;
            }
        }
    }

    createHint() {
        const hintRule = INITIAL_HINTS[Math.floor(Math.random() * INITIAL_HINTS.length)];
        return hintRule.generate(this.items);
    }
}















// ==========================================
// 4. ゲーム進行クラス
// ==========================================
class AuctionGame {
    constructor() {
        this.players = [];
        this.currentBox = null;
        this.currentPlayerIndex = 0;
        this.currentBiddingRound = 1;
        this.maxBiddingRounds = 3;
        this.initGame();
    }

    initGame() {
        // ローカルストレージからプレイ人数と名前のリストを読み込む
        const playerCount = parseInt(localStorage.getItem('auction_player_count')) || 4;
        const savedNamesJson = localStorage.getItem('auction_player_names');
        const savedNames = savedNamesJson ? JSON.parse(savedNamesJson) : [];

        this.players = [];
        
        // 読み込んだ人数分だけプレイヤーを生成する
        for (let i = 0; i < playerCount; i++) {
            const pName = savedNames[i] || `プレイヤー${i + 1}`;
            this.players.push(new Player(i + 1, pName, 40000));
        }
        
        this.startShopPhase();
    }

    // --- ショップフェーズ ---
    startShopPhase() {
        this.currentPlayerIndex = 0;
        this.nextShopTurn(0);
    }

    nextShopTurn(index) {
        this.currentPlayerIndex = index;
        const passBtn = document.getElementById('btn-pass-action');

        if (this.currentPlayerIndex < this.players.length) {
            const p = this.players[this.currentPlayerIndex];
            // ★テキストを「ゲーム開始前の〜」から変更し、用語も「ツール」に統一
            document.getElementById('pass-title').innerText = `次は ${p.name} の番です (ツールの購入フェーズ)`;
            passBtn.setAttribute("onclick", "game.showShopScreen()");
            this.changeScreen('screen-pass');
        } else {
            this.prepareNextBox();
        }
    }

    showShopScreen() {
        this.renderShopList();
        this.changeScreen('screen-shop');
    }

    renderShopList() {
        const p = this.players[this.currentPlayerIndex];
        ui.renderShopList(p); // UIの描画は専門のファイルにお任せする
    }

    buyItem(itemId, price) {
        const p = this.players[this.currentPlayerIndex];
        if (p.budget >= price && !p.inventory.includes(itemId) && p.inventory.length < MAX_INVENTORY_SIZE) {
            p.budget -= price;
            p.inventory.push(itemId);
            this.renderShopList(); 
        }
    }

    finishShopping() {
        this.nextShopTurn(this.currentPlayerIndex + 1);
    }

    // --- オークション進行 ---
    prepareNextBox() {
        // ★追加：新しい箱に移るタイミングで履歴をリセットする
        this.gameHistory = [];
        this.renderHistory(); // 画面の表示も空に戻しておく

        this.currentBox = new StorageBox("中身が不明な倉庫");
        this.currentBiddingRound = 1;

        // 5×5の空のマス目を画面に描く
        drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);
        
        for (let p of this.players) {
            p.currentBid = 0;
            p.fakeBidAmount = null;

            p.knownItems = [];
            // 前のラウンドのツール使用記録を消去する
            p.lastUsedItem = null;
        }

        drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);

        document.getElementById('display-item-name').innerText = this.currentBox.name;
        
        // 作成されたヒントを表示する
        document.getElementById('display-item-hint').innerHTML = this.currentBox.initialHint;
        
        document.getElementById('btn-pass-action').setAttribute("onclick", "game.startAuction()");
        this.changeScreen('screen-item');
    }

    startAuction() {
        this.startBiddingRound();
    }

    startBiddingRound() {
        this.currentPlayerIndex = 0;
        for (let p of this.players) {
            p.hasUsedItemThisRound = false;
            p.fakeBidAmount = null; // 偽装は毎ラウンドリセット
        }
        this.nextTurn(0);
    }

    // --- オークション進行のターン管理 ---
    nextTurn(index) {
        this.currentPlayerIndex = index;
        const passBtn = document.getElementById('btn-pass-action');
        // スマホを渡す画面では、前の人のシルエットが見えないように空にする
        drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);

        if (this.currentPlayerIndex < this.players.length) {
            const p = this.players[this.currentPlayerIndex];

            document.getElementById('pass-title').innerText = `次は ${p.name} の番です (入札ラウンド ${this.currentBiddingRound}/${this.maxBiddingRounds})`;
            passBtn.setAttribute("onclick", "game.showBidScreen()");
            this.changeScreen('screen-pass');
        } else {
            // ★追加：ゲーム履歴を保存する配列がなければ作成する
            if (!this.gameHistory) Object.assign(this, { gameHistory: [] });
            
            // ★追加：現在のラウンドの全員の行動を1つの記録としてまとめる
            const roundRecord = {
                round: this.currentBiddingRound,
                players: this.players.map(p => {
                    return {
                        name: p.name,
                        tool: p.lastUsedItem ? p.lastUsedItem : "使用なし",
                        bid: p.fakeBidAmount !== null ? p.fakeBidAmount : p.currentBid
                    };
                })
            };
            // 記録を履歴の配列に追加して、画面の表示を更新する
            this.gameHistory.push(roundRecord);
            this.renderHistory();

            this.players.forEach(p => {
            p.lastUsedItem = null;
            });

            // ★全員の入札が終わった時点で強制落札の判定を行う
            let isForced = this.checkForcedBuyout();

            // 強制落札の条件を満たしたか、最終ラウンドに到達した場合は結果発表へ
            if (isForced || this.currentBiddingRound >= this.maxBiddingRounds) {
                this.showBoxResult(isForced);
            } else {
                this.showIntermediateBids();
            }
        }
    }

    // 強制落札の判定ロジック
    checkForcedBuyout() {
        if (this.currentBiddingRound >= this.maxBiddingRounds) return false;

        // 入札額が高い順に並び替え（偽装入札の額ではなく、実際の入札額で判定します）
        let sorted = [...this.players].sort((a, b) => b.currentBid - a.currentBid);
        let highest = sorted[0].currentBid;
        let second = sorted[1].currentBid;

        // 現在のラウンドの倍率を取得
        let multiplier = BUYOUT_MULTIPLIERS[this.currentBiddingRound] || 1.0;

        // 1位が1ドル以上を入札しており、かつ2位の入札額の規定倍率以上なら強制落札
        // （※2位が0ドルの場合、1位が1ドルでも入札していれば即決となります）
        if (highest > 0 && highest >= second * multiplier) {
            return true;
        }
        return false;
    }

    showBidScreen() {
        const p = this.players[this.currentPlayerIndex];
        
        document.getElementById('bid-title').innerText = `${p.name} の入札 (入札ラウンド ${this.currentBiddingRound})`;
        document.getElementById('bid-budget').innerText = `現在の予算: $${p.budget}`;
        document.getElementById('bid-input').value = p.currentBid > 0 ? p.currentBid : ''; 

        // ★追加：入札画面に倉庫の初期ヒントをセットする
        document.getElementById('bid-initial-hint').innerHTML = this.currentBox.initialHint;
        
        // 自分のメモ帳を見てシルエットや色を描画する
        drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);
        p.knownItems.forEach(info => {
            drawer.drawScannedItem(info); // ★ここを (info) だけに変更
        });

        document.getElementById('item-effect-result').innerText = '';
        this.renderInventory();

        this.changeScreen('screen-bid');
    }

    renderInventory() {
       const p = this.players[this.currentPlayerIndex];
        ui.renderInventory(p);
    }















   // ★アイテムの具体的な効果（共通化・複数回対応版）
    useItem(itemId) {
        const p = this.players[this.currentPlayerIndex];
        p.hasUsedItemThisRound = true; 
        p.inventory = p.inventory.filter(id => id !== itemId);
        
        const effectArea = document.getElementById('item-effect-result');
        const usedItemData = SHOP_ITEMS.find(i => i.id === itemId);
        
        // 使ったアイテムのデータをSHOP_ITEMSから探して取得する
        // ★修正：偽装ツール（typeが'fake'）の場合は、履歴を「使用なし」と偽装するために記録しない
        if (usedItemData.type === 'fake') {
            p.lastUsedItem = null;
        } else {
            p.lastUsedItem = usedItemData.name;
        }

        if (usedItemData.type === 'size' || usedItemData.type === 'rarity' || usedItemData.type === 'detail') {
            // スキャン対象の重複を防ぐため、箱の中身をシャッフルしたリストを作る
            const shuffledItems = [...this.currentBox.items].sort(() => 0.5 - Math.random());
            
            // 箱の中身の数か、アイテムのスキャン回数のうち「少ない方」をループ回数にする
            const actualScanCount = Math.min(shuffledItems.length, usedItemData.count);

            // 決められた回数だけスキャンを繰り返す
            for (let i = 0; i < actualScanCount; i++) {
                const targetItem = shuffledItems[i];

                // ★ここを修正： 'size' と 'detail' の記録をしっかりと分ける
                if (usedItemData.type === 'size') {
                    // サイズスキャナーは 'silhouette' という名前で記録する
                    p.knownItems.push({ item: targetItem, scanType: 'silhouette' });
                } 
                else if (usedItemData.type === 'detail') {
                    // 完全鑑定器は 'detail' という名前で記録する
                    p.knownItems.push({ item: targetItem, scanType: 'detail' });
                } 
                else if (usedItemData.type === 'rarity') {
                    const offsetX = Math.floor(Math.random() * targetItem.w);
                    const offsetY = Math.floor(Math.random() * targetItem.h);
                    p.knownItems.push({ 
                        item: targetItem, 
                        scanType: 'rarity_dot',
                        dotX: targetItem.x + offsetX,
                        dotY: targetItem.y + offsetY
                    });
                }
            }

            // まとめて画面を再描画
            drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);
            p.knownItems.forEach(info => {
                drawer.drawScannedItem(info);
            });

            effectArea.innerText = `【スキャン結果】箱の中から ${actualScanCount} 個の反応を特定しました！`;
        } 
        // ハズレ検知器の処理
        else if (usedItemData.type === 'dud') {
            // 1. 箱の中に存在する全商品のレアリティランクを抽出し、低い順（昇順）に並べ替えて重複を消す
            const presentRanks = [...new Set(this.currentBox.items.map(item => getRarityRank(item.rarity)))].sort((a, b) => a - b);
            
            // 2. アイテムの深度(depth)に合わせて、対象となるランクの範囲を取得する
            const targetRanks = presentRanks.slice(0, usedItemData.depth);
            
            // 3. 対象ランクに当てはまる商品の「すべての1マス」の座標をリストアップする
            let candidateDots = [];
            for (let item of this.currentBox.items) {
                if (targetRanks.includes(getRarityRank(item.rarity))) {
                    for (let dy = 0; dy < item.h; dy++) {
                        for (let dx = 0; dx < item.w; dx++) {
                            candidateDots.push({
                                item: item,
                                scanType: 'dud_dot',
                                dotX: item.x + dx,
                                dotY: item.y + dy
                            });
                        }
                    }
                }
            }
            
            // 4. マスのリストをシャッフルして、指定された数（10マス）だけ取り出す
            candidateDots.sort(() => 0.5 - Math.random());
            const finalDots = candidateDots.slice(0, usedItemData.count);
            
            // 5. プレイヤーのメモ帳に記録し、画面を再描画
            finalDots.forEach(dot => p.knownItems.push(dot));
            
            drawer.drawEmptyGrid(this.currentBox.gridWidth, this.currentBox.gridHeight);
            p.knownItems.forEach(info => {
                drawer.drawScannedItem(info);
            });

            effectArea.innerText = `【スキャン結果】低価値な商品の反応を ${finalDots.length} マス分特定しました！`;
        }
        else if (usedItemData.type === 'fake') {
            const fakeAmount = prompt("他のプレイヤーに見せかける偽の入札額（半角数字）を入力してください:");
            const amountNum = parseInt(fakeAmount, 10);
            
            if (!isNaN(amountNum) && amountNum >= 0) {
                p.fakeBidAmount = amountNum;
                effectArea.innerText = `【偽装完了】ラウンド終了時、あなたの入札額は「$${amountNum}」として全体に公開されます。`;
            } else {
                alert("無効な数値です。アイテムの効果は不発になりました。");
                effectArea.innerText = `【失敗】偽装額の設定に失敗しました。`;
            }
        }

        this.renderInventory();
    }

















    submitBid() {
        const inputVal = document.getElementById('bid-input').value;
        const amount = parseInt(inputVal, 10);
        const p = this.players[this.currentPlayerIndex];

        if (isNaN(amount) || amount < 0) { alert('有効な金額を入力してください。'); return; }
        if (amount > p.budget) { alert('予算オーバーです！'); return; }
        if (amount < p.currentBid) { alert('前回の自分の入札額を下回ることはできません！'); return; }

        p.bid(amount);
        this.nextTurn(this.currentPlayerIndex + 1);
    }

    // ==========================================
    //アイテム図鑑関連のメソッド
    // ==========================================
    
    // 図鑑画面の表示／非表示を切り替える
    toggleEncyclopedia(show) {
        const modal = document.getElementById('modal-encyclopedia');
        if (show) {
            // 表示する直前にリストを生成する
            this.renderEncyclopedia();
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    // 引数 filterCondition に関数を渡すことで、後から簡単に絞り込みを実装できます
    renderEncyclopedia(filterCondition = null) {
        ui.renderEncyclopedia(filterCondition);
    }

    // --- 結果発表系 ---
    showIntermediateBids() {
        // UIにラウンド数とプレイヤーデータを渡して描画させる
        ui.showIntermediateBids(this.currentBiddingRound, this.players);
        
        // 画面の切り替え指示はゲーム進行役がそのまま担当する
        this.changeScreen('screen-result');
    }

    advanceBiddingRound() {
        this.currentBiddingRound++;
        this.startBiddingRound();
    }

    showBoxResult(isForced = false) {
        // 1. 全員の入札額から最高額を見つける
        let highestBid = 0;
        this.players.forEach(p => {
            let finalBid = p.fakeBidAmount !== null ? p.fakeBidAmount : p.currentBid;
            if (finalBid > highestBid) highestBid = finalBid;
        });

        // 2. 最高額を入札したプレイヤーをリストアップする
        const topBidders = this.players.filter(p => {
            let finalBid = p.fakeBidAmount !== null ? p.fakeBidAmount : p.currentBid;
            return finalBid === highestBid;
        });

        // 3. 落札のお金の移動（計算）処理
        let winner = null;
        let actualBid = 0;
        let profit = 0;

        // 単独トップ（1人だけ）の場合のみ、お金を動かす
        if (highestBid > 0 && topBidders.length === 1) {
            winner = topBidders[0];
            actualBid = winner.fakeBidAmount !== null ? winner.currentBid : highestBid;
            
            winner.budget -= actualBid;
            winner.budget += this.currentBox.totalActualValue; 
            profit = this.currentBox.totalActualValue - actualBid;
        }

        // 4. 計算結果をすべてまとめて、ui.jsに「これを表示して！」と渡す
        ui.showBoxResult({
            isForced: isForced,
            highestBid: highestBid,
            topBidders: topBidders,
            winner: winner,
            actualBid: actualBid,
            profit: profit,
            currentBox: this.currentBox,
            players: this.players,
            currentBiddingRound: this.currentBiddingRound
        });

        // 5. 計算されたアイテムの形をマス目の上に表示する
        drawer.drawItems(this.currentBox.items);
        
        // 6. 画面の切り替え
        this.changeScreen('screen-result');
    }

    changeScreen(showId) {
        ['screen-shop', 'screen-item', 'screen-pass', 'screen-bid', 'screen-result'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        document.getElementById(showId).classList.remove('hidden');
    }

    reset() {
        location.reload();
    }

    // 履歴画面の開閉を切り替える
    toggleHistory(show) {
        const modal = document.getElementById('modal-history');
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    // 記録された履歴の配列から表（テーブル）を作成し、HTMLに反映する
    renderHistory() {
        ui.renderHistory(this.gameHistory);
    }
}

// ゲーム起動
const game = new AuctionGame();