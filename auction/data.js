// ==========================================
// 1. マスターデータ
// ==========================================
const MAX_INVENTORY_SIZE = 3;

const MIN_ITEMS_PER_BOX = 5; // 少なくとも入っている
const MAX_ITEMS_PER_BOX = 15; // 最大で入る

const SHOW_ITEM_TIME = 800;

const SHOP_ITEMS = [
    // --- サイズスキャナー（価格帯：安め。罠を見抜くベースツール） ---
    { id: "size_scanner_3", name: "サイズスキャナー3", price: 1500, description: "商品3つのマス数を確認する", type: "size", count: 3 },
    { id: "size_scanner_6", name: "サイズスキャナー6", price: 3000, description: "商品6つのマス数を確認する", type: "size", count: 6 },
    { id: "size_scanner_9", name: "サイズスキャナー9", price: 4500, description: "商品9つのマス数を確認する", type: "size", count: 9 },

    // --- レア度チェッカー（価格帯：中〜高め。お宝を探し当てる強力ツール） ---
    { id: "rarity_scanner_3", name: "レア度チェッカー3", price: 3000, description: "商品3つのレア度(1マス)を確認する", type: "rarity", count: 3 },
    { id: "rarity_scanner_6", name: "レア度チェッカー6", price: 6000, description: "商品6つのレア度(各1マス)を確認する", type: "rarity", count: 6 },
    { id: "rarity_scanner_9", name: "レア度チェッカー9", price: 9000, description: "商品9つのレア度(各1マス)を確認する", type: "rarity", count: 9 },

    // --- 完全鑑定器（価格帯：超高額。確実な答えがわかるVIPツール） ---
    { id: "detail_scanner_3", name: "完全鑑定器3", price: 6000, description: "商品3つのマス数と正確な価値($)を確認する", type: "detail", count: 3 },
    { id: "detail_scanner_6", name: "完全鑑定器6", price: 12000, description: "商品6つのマス数と正確な価値($)を確認する", type: "detail", count: 6 },

    // --- ハズレ検知器（価格帯：中。大赤字を回避する堅実な保険） ---
    { id: "dud_scanner_1", name: "ハズレ検知器（単）", price: 1000, description: "箱内で最も低いレアリティの商品をランダムに最大5マス分表示する", type: "dud", count: 5, depth: 1 },
    { id: "dud_scanner_2", name: "ハズレ検知器（複）", price: 2000, description: "箱内で低い方から2つのレアリティの商品をランダムに最大5マス分表示する", type: "dud", count: 5, depth: 2 },

    // --- 特殊ツール（価格帯：高め。場を荒らすブラフ専用） ---
    { id: "fake_bid", name: "偽装入札チケット", price: 3000, description: "このラウンドの入札額を別の金額に偽装する", type: "fake", count: 1 },
];

const RARITY_CONFIG = {
    "N":  { label: "ノーマル", rank: 1, variance: 0.35, color: "#7f8c8d" }, // 35%（据え置き）
    "R":  { label: "レア",     rank: 2, variance: 0.40, color: "#2ecc71" }, // 40%（据え置き）
    "SR": { label: "スーパーレア", rank: 3, variance: 0.20, color: "#3498db" }, // 15% → 20%に増量（箱をカラフルに保つ）
    "UR": { label: "ウルトラレア", rank: 4, variance: 0.04, color: "#9b59b6" }, // 8% → 4%に半減
    "LR": { label: "レジェンドレア", rank: 5, variance: 0.01, color: "#f1c40f" }  // 2% → 1%に半減
};
function getRarityRank(label) {
    for (let key in RARITY_CONFIG) {
        if (RARITY_CONFIG[key].label === label) return RARITY_CONFIG[key].rank;
    }
    return 999;
}

// ★変更：sizeを廃止し、w(幅)とh(高さ)に変更
// 商品データベース（運要素を抑え、平均$5,000〜$8,000に収まりやすくしたバランス調整版）
// weight の合計を100に設定し、設定した確率（N:35%, R:40%, SR:15%, UR:8%, LR:2%）と完全に連動させています。
// 商品データベース（UR・LRの出現率を半分にし、SRを少し増やした決定版）
// ※細かい確率を整数で設定するため、weightの合計を「200」にしています。
const ITEM_DATABASE = [
    // --- 罠（合計 weight: 30） ---
    { name: "大量の空ダンボール", w: 4, h: 4, rarity: "N", value: 100, weight: 10, description: "場所をとるだけのゴミ。" },
    { name: "カビの生えた古着の山", w: 3, h: 3, rarity: "N", value: 150, weight: 10, description: "売るのに苦労する。" },
    { name: "壊れたパイプベッド", w: 2, h: 4, rarity: "N", value: 150, weight: 10, description: "鉄くずとしての価値しかない。" },

    // --- N（ノーマル・合計 weight: 40） ---
    { name: "中古の自転車", w: 2, h: 1, rarity: "N", value: 200, weight: 8, description: "まだ乗れる。" },
    { name: "古いブラウン管テレビ", w: 2, h: 2, rarity: "N", value: 300, weight: 8, description: "マニアには売れるかも。" },
    { name: "日用雑貨の詰め合わせ", w: 1, h: 1, rarity: "N", value: 100, weight: 10, description: "よくあるガラクタ。" },
    { name: "ボロボロのソファ", w: 3, h: 2, rarity: "N", value: 400, weight: 8, description: "スプリングが飛び出ている。" },
    { name: "無名の絵画", w: 2, h: 2, rarity: "N", value: 300, weight: 6, description: "価値は高くない。" },

    // --- R（レア・合計 weight: 80） ---
    { name: "ブランド物のバッグ", w: 2, h: 2, rarity: "R", value: 800, weight: 20, description: "少し傷があるが本物。" },
    { name: "アンティーク時計", w: 1, h: 1, rarity: "R", value: 400, weight: 20, description: "コレクターに人気。" },
    { name: "高級ゴルフクラブ", w: 1, h: 3, rarity: "R", value: 600, weight: 20, description: "プロモデルの良品。" },
    { name: "ヴィンテージカメラ", w: 1, h: 1, rarity: "R", value: 500, weight: 20, description: "レンズは綺麗。" },

    // --- SR（スーパーレア・合計 weight: 40） ---
    { name: "純金のインゴット", w: 1, h: 1, rarity: "SR", value: 1500, weight: 14, description: "小さくても重い！" },
    { name: "最新型ゲーミングPC", w: 2, h: 2, rarity: "SR", value: 1200, weight: 13, description: "最高スペックの化け物。" },
    { name: "高級ペルシャ絨毯", w: 3, h: 2, rarity: "SR", value: 2000, weight: 13, description: "手織りの超一級品。" },

    // --- UR（ウルトラレア・合計 weight: 8） ---
    { name: "歴史的な壺", w: 2, h: 2, rarity: "UR", value: 2500, weight: 4, description: "博物館レベルの代物。" },
    { name: "有名アーティストの彫刻", w: 2, h: 3, rarity: "UR", value: 3000, weight: 4, description: "オークションで跳ねる逸品。" },

    // --- LR（レジェンドレア・合計 weight: 2） ---
    { name: "幻のルネサンス絵画", w: 3, h: 2, rarity: "LR", value: 5000, weight: 1, description: "世界に数点しかない本物。" },
    { name: "伝説の海賊の宝箱", w: 2, h: 2, rarity: "LR", value: 6000, weight: 1, description: "宝石がぎっしり詰まっている。" }
];

//初期ヒントのバリエーション設定
const INITIAL_HINTS = [
    {
        id: "average_price",
        generate: (items) => {
            // 箱の中身からランダムに抽出する（箱の中身が少ない場合はその数に合わせる）
            let sampleCount = Math.floor(Math.random() * 8) + 5; 
            if (sampleCount > items.length) sampleCount = items.length;

            // 商品をシャッフルして、先頭から必要な数だけ取り出す
            const shuffled = [...items].sort(() => 0.5 - Math.random());
            const sampledItems = shuffled.slice(0, sampleCount);
            
            // 抽出した商品の合計価値を計算し、平均を出す
            const totalValue = sampledItems.reduce((sum, item) => sum + item.value, 0);
            const avgValue = Math.floor(totalValue / sampleCount);
            
            return `【ヒント】箱の中の商品のうち、ランダムな ${sampleCount} 個の平均価値は $${avgValue} です。`;
        }
    },

    // 合計マス数の最低保証ラインを提示するヒント
    {
        id: "minimum_total_size",
        generate: (items) => {
            if (items.length === 0) return "【初期ヒント】箱の中は空っぽのようです…";
            
            // 1. 箱の中に入っている商品の「本当の合計マス数」を計算する
            const trueTotalSize = items.reduce((sum, item) => sum + (item.w * item.h), 0);
            
            // 2. ヒントとして出す数値(N)を決定する
            // あまりにも小さい数字が出るとヒントにならないため、本当のマス数の「60% 〜 100%」の間でランダムに決める
            const minSize = Math.max(1, Math.floor(trueTotalSize * 0.6));
            const hintSize = Math.floor(Math.random() * (trueTotalSize - minSize + 1)) + minSize;
            
            return `【ヒント】センサーの反応によると、箱の中の商品の合計サイズは「 ${hintSize} マス以上」あるようです。`;
        }
    },
    
    // 箱の中にある最高レアリティを提示するヒント
    {
        id: "highest_rarity",
        generate: (items) => {
            if (items.length === 0) return "【ヒント】箱の中は空っぽのようです…";

            let highestRank = 0;
            let highestLabel = 'ノーマル';
            let highestColor = '#7f8c8d';

            // 箱の中身をすべて確認し、一番高いランクを見つける
            items.forEach(item => {
                // item.rarity と RARITY_CONFIG のラベルを照らし合わせる
                for (const key in RARITY_CONFIG) {
                    const config = RARITY_CONFIG[key];
                    if (config.label === item.rarity) {
                        if (config.rank > highestRank) {
                            highestRank = config.rank;
                            highestLabel = config.label;
                            highestColor = config.color;
                        }
                    }
                }
            });

            // 文字に色をつけるためHTMLタグ（span）を含めて返す
            return `【ヒント】この箱に含まれる最高レアリティは <span style="color: ${highestColor}; font-weight: bold;">${highestLabel}</span> です。`;
        }
    }
];

let BUYOUT_MULTIPLIERS = {
    1: 2.0, 
    2: 1.5, 
    3: 1.2, 
    4: 1.1  
};

// ★追加：ローカルストレージに設定があれば、そちらで上書きする
const savedMultipliersJson = localStorage.getItem('auction_buyout_multipliers');
if (savedMultipliersJson) {
    BUYOUT_MULTIPLIERS = JSON.parse(savedMultipliersJson);
}