// draw.js
// 画面への「マス目」と「アイテム」の描画だけを担当するクラス

class DrawManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.cellSize = 50; // 1マスのサイズ(ピクセル)
    }

    // 指定された幅と高さの「空のマス目」を描画する
    drawEmptyGrid(width, height) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = ''; // 一度中身をリセット

        const gridDiv = document.createElement('div');
        gridDiv.id = 'inventory-grid';
        
        // CSS Gridを使ってマス目の枠組みを作る
        gridDiv.style.display = 'grid';
        gridDiv.style.gridTemplateColumns = `repeat(${width}, ${this.cellSize}px)`;
        gridDiv.style.gridTemplateRows = `repeat(${height}, ${this.cellSize}px)`;
        gridDiv.style.gap = '2px';
        gridDiv.style.backgroundColor = '#34495e'; // マス目の枠線の色になる
        gridDiv.style.padding = '4px';
        gridDiv.style.margin = '0 auto 20px';
        gridDiv.style.width = 'max-content';

        // 5×5=25個の「空のマス」を敷き詰める
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.style.gridColumn = `${x + 1}`;
                cell.style.gridRow = `${y + 1}`;
                cell.style.backgroundColor = '#ecf0f1'; // 空マスの色
                gridDiv.appendChild(cell);
            }
        }

        container.appendChild(gridDiv);
    }

    // 計算された座標(x, y)と形(w, h)をもとに、アイテムをマス目の上に重ねて描画する
    drawItems(items) {
        const gridDiv = document.getElementById('inventory-grid');
        if (!gridDiv) return;

        // ★追加：配列の index (0, 1, 2...) を使って時間差を作る
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            
            // どこからどこまでマスを占有するかを指定（CSS Gridは1から数えるので+1する）
            itemDiv.style.gridColumn = `${item.x + 1} / span ${item.w}`;
            itemDiv.style.gridRow = `${item.y + 1} / span ${item.h}`;
            
            // レア度に応じた色を設定
            itemDiv.style.backgroundColor = this.getColorByRarity(item.rarity);
            itemDiv.style.border = '2px solid rgba(0,0,0,0.5)';
            itemDiv.style.boxSizing = 'border-box';
            
            // テキストを中央に配置
            itemDiv.style.display = 'flex';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.justifyContent = 'center';
            itemDiv.style.color = 'white';
            itemDiv.style.fontSize = '12px';
            itemDiv.style.fontWeight = 'bold';
            itemDiv.style.textAlign = 'center';
            itemDiv.style.padding = '2px';
            itemDiv.style.zIndex = '10'; // 空マスの上に確実に重ねる

            itemDiv.innerText = item.name;

            // ==========================================
            // ★アニメーションの初期状態（透明＆少し縮小）
            // ==========================================
            itemDiv.style.opacity = '0';
            itemDiv.style.transform = 'scale(0.5)';
            // トランジション（変化の仕方）の設定。cubic-bezierで少し跳ねる動き（バウンス）を作ります
            itemDiv.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            gridDiv.appendChild(itemDiv);

            // ==========================================
            // ★時間差をつけて表示状態（不透明＆等倍）に戻す
            // ==========================================
            // index * 400 で、1つ目は0秒後、2つ目は0.4秒後、3つ目は0.8秒後...とズラす
            setTimeout(() => {
                itemDiv.style.opacity = '1';
                itemDiv.style.transform = 'scale(1)';
            }, index * SHOW_ITEM_TIME); 
        });
    }

    // 判明したアイテムの情報をマス目の上に描画する
    // 引数 info には、アイテムデータとスキャンの種類、さらに1マス表示用の座標が入ります
    drawScannedItem(info) {
        const gridDiv = document.getElementById('inventory-grid');
        if (!gridDiv) return;

        const item = info.item;
        const itemDiv = document.createElement('div');
        
        // 基本はアイテムの本来のサイズと位置
        let colStart = item.x + 1;
        let rowStart = item.y + 1;
        let colSpan = item.w;
        let rowSpan = item.h;

        // 'dud_dot' の場合も、1マスだけの表示として位置とサイズを上書きする
        if (info.scanType === 'rarity_dot' || info.scanType === 'dud_dot') {
            colStart = info.dotX + 1;
            rowStart = info.dotY + 1;
            colSpan = 1;
            rowSpan = 1;
        }

        itemDiv.style.gridColumn = `${colStart} / span ${colSpan}`;
        itemDiv.style.gridRow = `${rowStart} / span ${rowSpan}`;
        itemDiv.style.boxSizing = 'border-box';
        itemDiv.style.zIndex = '5'; 
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.justifyContent = 'center';
        itemDiv.style.fontWeight = 'bold';

        // 見た目の切り替え
        if (info.scanType === 'silhouette') {
            itemDiv.style.backgroundColor = '#2c3e50'; 
            itemDiv.style.border = '2px dashed #95a5a6'; 
            itemDiv.style.color = '#95a5a6';
            itemDiv.style.fontSize = '20px';
            itemDiv.innerText = '?'; 
        } else if (info.scanType === 'rarity_dot') {
            itemDiv.style.backgroundColor = this.getColorByRarity(item.rarity);
            itemDiv.style.border = '2px solid rgba(0,0,0,0.8)';
            itemDiv.style.color = 'white';
            itemDiv.style.fontSize = '16px';
            itemDiv.innerText = '★'; // レア度の反応であることを示すマーク
        }
        // 完全鑑定器の見た目
        else if (info.scanType === 'detail') {
            itemDiv.style.backgroundColor = this.getColorByRarity(info.item.rarity); // 高級感のある紫色
            itemDiv.style.border = '2px solid #2c3e50';
            itemDiv.style.color = 'white';
            itemDiv.style.fontSize = '16px';
            itemDiv.innerText = `$${info.item.value}`; // マスの中央に金額を表示
        }
        // ハズレ検知器の見た目（レア度の色＋ハズレマーク）
        else if (info.scanType === 'dud_dot') {
            itemDiv.style.backgroundColor = this.getColorByRarity(info.item.rarity);
            itemDiv.style.border = '2px solid rgba(0,0,0,0.8)';
            itemDiv.style.color = 'white';
            itemDiv.style.fontSize = '16px';
            itemDiv.innerText = '✖'; 
        }

        gridDiv.appendChild(itemDiv);
    }

    // レア度ごとにブロックの色を変える
    getColorByRarity(rarityLabel) {
        // RARITY_CONFIGの中から、日本語ラベルが一致するものを探して色を返す
        for (const key in RARITY_CONFIG) {
            if (RARITY_CONFIG[key].label === rarityLabel) {
                return RARITY_CONFIG[key].color;
            }
        }
        // 万が一見つからなかった場合の予備色（グレー）
        return '#7f8c8d';
    }
}

// 他のファイル（game.js）からすぐに使えるように、準備しておく
const drawer = new DrawManager('inventory-container');