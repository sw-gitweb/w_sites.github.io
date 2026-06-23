const ui = {
    // ツール購入画面の描画
    renderShopList: function(player) {
        document.getElementById('shop-title').innerText = `${player.name} の購入フェーズ`;
        document.getElementById('shop-budget').innerText = `現在の予算: $${player.budget}`;
        
        // カテゴリごとのHTMLを貯めておく変数
        let htmlSize = '';
        let htmlRarity = '';
        let htmlSpecial = '';

        SHOP_ITEMS.forEach(item => {
            const isOwned = player.inventory.includes(item.id);
            const isFull = player.inventory.length >= MAX_INVENTORY_SIZE;
            const canAfford = player.budget >= item.price;
            
            let disabled = '';
            let btnText = `$${item.price} で購入`;
            
            if (isOwned) { disabled = 'disabled'; btnText = '所持済み'; }
            else if (!canAfford) { disabled = 'disabled'; btnText = '予算不足'; }
            else if (isFull) { disabled = 'disabled'; btnText = '所持上限'; }

            // グリッドレイアウトに合わせて、カード型のデザインに整形
            const itemHtml = `
                <div style="background: white; border: 1px solid #ccc; padding: 10px; border-radius: 5px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <strong style="font-size: 13px; color: #2c3e50;">${item.name}</strong><br>
                        <div style="font-size: 11px; color: #7f8c8d; margin: 8px 0; line-height: 1.3;">${item.description}</div>
                    </div>
                    <button ${disabled} onclick="game.buyItem('${item.id}', ${item.price})" style="width: 100%; padding: 6px; font-size: 12px; margin: 0; background: ${disabled ? '#bdc3c7' : '#3498db'};">${btnText}</button>
                </div>
            `;

            // ツールのtypeを見て、入れる箱（変数）を振り分ける
            if (item.type === 'size') {
                htmlSize += itemHtml;
            } else if (item.type === 'rarity') {
                htmlRarity += itemHtml;
            } else {
                htmlSpecial += itemHtml;
            }
        });

        // それぞれのカテゴリの枠に流し込む
        document.getElementById('shop-cat-size').innerHTML = htmlSize;
        document.getElementById('shop-cat-rarity').innerHTML = htmlRarity;
        document.getElementById('shop-cat-special').innerHTML = htmlSpecial;

        // 現在の所持ツールを下に文字でプレビュー表示する
        const ownedNames = player.inventory.map(id => {
            const found = SHOP_ITEMS.find(i => i.id === id);
            return found ? found.name : '不明';
        });
        const inventoryText = ownedNames.length > 0 ? ownedNames.join('、 ') : 'なし';
        document.getElementById('shop-inventory-preview').innerHTML = `<strong>現在の所持ツール（${player.inventory.length}/${MAX_INVENTORY_SIZE}）:</strong> ${inventoryText}`;
    },



    // ツール使用エリア（インベントリ）の描画
    renderInventory: function(player) {
        const itemUseDiv = document.getElementById('item-use-area');
        
        if (player.inventory.length === 0) {
            itemUseDiv.innerHTML = '<p style="color: #666; font-size: 14px;">所持ツールはありません</p>';
            return;
        }

        let inventoryHtml = '<p style="font-weight: bold; font-size: 14px;">所持ツール:</p>';
        
        player.inventory.forEach(itemId => {
            const itemData = SHOP_ITEMS.find(i => i.id === itemId);
            const disabled = player.hasUsedItemThisRound ? 'disabled' : '';
            inventoryHtml += `
                <button class="use-btn" ${disabled} onclick="game.useItem('${itemId}')">
                    ${itemData.name}を使用
                </button>
            `;
        });

        if (player.hasUsedItemThisRound) {
            inventoryHtml += '<p style="color: red; font-size: 12px;">このラウンドでは既にツールを使用しました</p>';
        }

        itemUseDiv.innerHTML = inventoryHtml;
    },



    // 商品図鑑の描画
    renderEncyclopedia: function(filterCondition = null) {
        const listArea = document.getElementById('encyclopedia-list');
        listArea.innerHTML = ''; 

        let targetItems = ITEM_DATABASE;
        if (filterCondition) {
            targetItems = targetItems.filter(filterCondition);
        }

        let listHtml = '<ul style="list-style: none; padding: 0; margin: 0;">';
        
        targetItems.forEach(item => {
            const totalSize = item.w * item.h;

            // ★修正：RARITY_CONFIG から色と「日本語ラベル」の両方を取得
            const rarityInfo = RARITY_CONFIG[item.rarity];
            const itemColor = rarityInfo.color;
            const itemLabel = rarityInfo.label; 

            // マス目のHTMLを組み立てる
            let gridCellsHtml = '';
            for (let i = 0; i < totalSize; i++) {
                gridCellsHtml += `<div style="background-color: ${itemColor}; border: 1px solid rgba(0,0,0,0.5); width: 100%; height: 100%; box-sizing: border-box;"></div>`;
            }

            listHtml += `
                <li style="border-bottom: 1px dashed #eee; padding: 10px 0; display: flex; align-items: center; gap: 15px;">
                    <div style="display: grid; grid-template-columns: repeat(${item.w}, 15px); grid-template-rows: repeat(${item.h}, 15px); width: ${item.w * 15}px; height: ${item.h * 15}px; flex-shrink: 0;">
                        ${gridCellsHtml}
                    </div>

                    <div>
                        <strong style="font-size: 16px;">${item.name}</strong><br>
                        <span style="font-size: 14px; color: #555;">
                            価値: <span style="color: #28a745; font-weight: bold;">$${item.value}</span> | 
                            サイズ: <strong>ヨコ${item.w}×タテ${item.h}（計${totalSize}マス）</strong> | 
                            レア度: ${itemLabel} </span>
                    </div>
                </li>
            `;
        });
        
        listHtml += '</ul>';
        listArea.innerHTML = listHtml;
    },



    // ラウンドごとの途中経過（入札額）の描画
    showIntermediateBids: function(currentBiddingRound, players) {
        document.getElementById('result-title').innerText = `【ラウンド ${currentBiddingRound} 終了】`;
        
        // 偽装入札（fakeBidAmount）が設定されていれば、そちらを表示する
        let listHtml = players.map(p => {
            let displayAmount = (p.fakeBidAmount !== null) ? p.fakeBidAmount : p.currentBid;
            return `<li>${p.name}: <strong>$${displayAmount}</strong></li>`;
        }).join('');

        let resultHtml = `
            <p>現在の入札額：</p>
            <ul style="list-style:none; padding:0; font-size:18px;">${listHtml}</ul>
            <hr>
            <p>次の入札ラウンドを行います。</p>
        `;

        document.getElementById('result-details').innerHTML = resultHtml;
        
        const resultBtn = document.getElementById('btn-result-action');
        resultBtn.innerText = `第${currentBiddingRound + 1}ラウンドへ進む`;
        resultBtn.setAttribute("onclick", "game.advanceBiddingRound()");
    },



    // ラウンド結果・落札結果の描画
    showBoxResult: function(data) {
        // game.jsから渡された計算結果のデータを受け取る
        const { isForced, highestBid, topBidders, winner, actualBid, profit, currentBox, players, currentBiddingRound } = data;

        // 強制落札された場合はタイトルを派手にする
        let titleText = isForced ? `【🚨 圧倒的資金力による強制落札！倉庫開封】` : `【倉庫の落札結果＆開封！】`;
        document.getElementById('result-title').innerText = titleText;

        let resultHtml = '';

        // ★追加：スキップボタン（最初は表示しておく）
        resultHtml += `
            <button id="btn-skip-reveal" class="btn btn-blue" style="margin-bottom: 20px;" onclick="ui.skipReveal()">
                演出をスキップして結果を見る ⏩
            </button>
        `;

        // ★追加：ここから「隠すエリア」スタート
        resultHtml += `<div id="final-result-details" class="hidden">`;

        if (highestBid === 0) {
            resultHtml += `<p>誰も入札しなかったため、この倉庫は流されました。</p>`;
        } 
        else if (topBidders.length > 1) {
            // 流札（同額バッティング）の処理
            resultHtml += `
                <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <h3 style="color: #721c24; margin-top: 0;">【取引破談（流札）】</h3>
                    <p style="font-size: 18px; font-weight: bold; color: #721c24;">最高額 $${highestBid} で入札が衝突しました！</p>
                    <p style="color: #721c24;">（該当者: ${topBidders.map(p => p.name).join(' と ')}）</p>
                    <p style="color: #721c24; margin-bottom: 0;">競り合いが過熱しすぎたため、この倉庫のオークションは無効となりました。<br>誰も商品を獲得できず、入札金は各自の手元に戻ります。</p>
                </div>
                <hr>
                <p><strong>📦 ちなみに、箱の中身はこちらでした...</strong></p>
                <p>合計価値: <strong>$${currentBox.totalActualValue}</strong></p>
            `;
        } 
        else {
            // 通常の落札処理（単独トップ）
            if (isForced) {
                resultHtml += `
                    <p style="color: #d35400; font-weight: bold; background: #fff3cd; padding: 10px; border-radius: 5px;">
                        第${currentBiddingRound}ラウンドにて、2位の入札額と規定の倍率以上の差がついたため、強制落札ルールが発動しました！
                    </p>
                `;
            }

            resultHtml += `
                <p>落札者: <strong>${winner.name}</strong>（$${actualBid}で落札）</p>
                <hr>
                <p><strong>📦 箱の中身はこちら！即時売却されました。</strong></p>
                <p>合計売却額: <strong>$${currentBox.totalActualValue}</strong></p>
            `;

            if (profit >= 0) {
                resultHtml += `<p style="color:green; font-weight:bold;">🎉 ${winner.name} は $${profit} の黒字！</p>`;
            } else {
                resultHtml += `<p style="color:red; font-weight:bold;">😭 ガラクタばかりでした... $${Math.abs(profit)} の赤字！</p>`;
            }
        }

        resultHtml += `
            <hr>
            <p><strong>現在の順位（残高順）：</strong></p>
            <ol style="display:inline-block; text-align:left;">
                ${[...players].sort((a, b) => b.budget - a.budget).map(p => `<li>${p.name}: $${p.budget}</li>`).join('')}
            </ol>
        `;

        document.getElementById('result-details').innerHTML = resultHtml;

        const resultBtn = document.getElementById('btn-result-action');
        resultBtn.innerText = "次の倉庫へ進む（ツール購入へ）";
        resultBtn.setAttribute("onclick", "game.startShopPhase()");

        // ★追加：演出が終わるまでは「次へ進む」ボタンも隠しておく
        resultBtn.classList.add('hidden');
        // ★追加：アニメーション終了を待ってから結果を表示するタイマー
        // (アイテム数 × 800ms) + 余裕(400ms) 待つ
        const animationTime = (currentBox.items.length * SHOW_ITEM_TIME) + 400;
        this.revealTimeout = setTimeout(() => {
            this.finishReveal();
        }, animationTime);
    },

    // ==========================================
    // ★追加：演出を終わらせて結果を出す関数
    // ==========================================
    finishReveal: function() {
        const detailsDiv = document.getElementById('final-result-details');
        const skipBtn = document.getElementById('btn-skip-reveal');
        const nextBtn = document.getElementById('btn-result-action');

        if (detailsDiv) detailsDiv.classList.remove('hidden'); // 結果を表示
        if (skipBtn) skipBtn.classList.add('hidden');           // スキップボタンを消す
        if (nextBtn) nextBtn.classList.remove('hidden');        // 次へ進むボタンを表示
    },

    // ==========================================
    // ★追加：スキップボタンを押した時の処理
    // ==========================================
    skipReveal: function() {
        // 待機タイマーをキャンセル
        if (this.revealTimeout) {
            clearTimeout(this.revealTimeout);
        }
        
        // マス目のアイテムを強制的にすべて表示させる
        const gridDiv = document.getElementById('inventory-grid');
        if (gridDiv) {
            const items = gridDiv.querySelectorAll('div');
            items.forEach(itemDiv => {
                itemDiv.style.transition = 'none'; // ふわっとするアニメーションを停止
                itemDiv.style.opacity = '1';       // 強制表示
                itemDiv.style.transform = 'scale(1)';
            });
        }

        // 結果を即座に表示
        this.finishReveal();
    },



    // ラウンド履歴の描画
    renderHistory: function(gameHistory) {
        const listArea = document.getElementById('history-list');
        if (!gameHistory || gameHistory.length === 0) {
            listArea.innerHTML = '<p style="color: #666; text-align: center;">まだ履歴はありません。</p>';
            return;
        }

        let html = '';
        // 新しい履歴が一番上に来るように、配列を逆順（reverse）にして処理する
        [...gameHistory].reverse().forEach(record => {
            html += `
                <div style="border: 1px solid #ccc; margin-bottom: 20px; border-radius: 5px; overflow: hidden;">
                    <div style="background: #2c3e50; color: white; padding: 10px; font-weight: bold;">第${record.round}ラウンド</div>
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                        <tr>
                            <th style="border-bottom: 1px solid padding: 10px;">プレイヤー</th>
                            <th style="border-bottom: 1px solid padding: 10px;">使用ツール</th>
                            <th style="border-bottom: 1px solid padding: 10px;">公開入札額</th>
                        </tr>
            `;
            
            record.players.forEach(p => {
                // ツールを使用している場合は文字色をオレンジにして目立たせる
                let toolColor = p.tool === "使用なし" ? "#7f8c8d" : "#e67e22";
                html += `
                    <tr>
                        <td style="border-bottom: 1px solid #eee; padding: 10px; font-weight: bold;">${p.name}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 10px; color: ${toolColor}; font-weight: bold;">${p.tool}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 10px;">$${p.bid}</td>
                    </tr>
                `;
            });
            
            html += `
                    </table>
                </div>
            `;
        });
        listArea.innerHTML = html;
    }
};