type MessageEntry = { en: string; cn?: string; tw?: string; ja?: string };

const MESSAGES: Record<string, MessageEntry> = {
    whisper_theme_menu: {
        en: 'Whisper theme',
        cn: '浅吟主题',
        tw: '淺吟主題',
        ja: '囁きテーマ',
    },
    analytics_enable: {
        en: 'Anonymous analytics',
        cn: '匿名统计信息',
        tw: '匿名統計資訊',
        ja: '匿名の統計情報',
    },
    debug_show_message: {
        en: 'Debug information',
        cn: '调试信息',
        tw: '除錯資訊',
        ja: 'デバッグ情報',
    },
    text_half_bg: {
        en: 'Text half-height background',
        cn: '文本半高背景',
        tw: '文字半高背景',
        ja: 'テキスト半高背景',
    },
    toolbar_fusion: {
        en: 'Top bar fusion',
        cn: '顶栏融合',
        tw: '頂欄融合',
        ja: 'トップバー融合',
    },
    appearance_light: {
        en: 'Light appearance',
        cn: '明亮界面配色',
        tw: '明亮介面配色',
        ja: 'ライト外観',
    },
    appearance_dark: {
        en: 'Dark appearance',
        cn: '暗黑界面配色',
        tw: '暗黑介面配色',
        ja: 'ダーク外観',
    },
    text: {
        en: 'Text colors',
        cn: '文本配色',
        tw: '文字配色',
        ja: 'テキスト配色',
    },
    scheme_native: {
        en: 'Native',
        cn: '原生',
        tw: '原生',
        ja: 'ネイティブ',
    },
    scheme_blush: {
        en: 'Blush',
        cn: '胭脂',
        tw: '胭脂',
        ja: 'ブラッシュ',
    },
    scheme_graphite: {
        en: 'Graphite',
        cn: '石墨',
        tw: '石墨',
        ja: 'グラファイト',
    },
    scheme_rainbow: {
        en: 'Rainbow',
        cn: '虹彩',
        tw: '虹彩',
        ja: '虹色',
    },
};

type LocaleKey = keyof MessageEntry;

const LANG_MAP: Record<string, LocaleKey> = {
    'zh-CN': 'cn',
    'zh-TW': 'tw',
    ja: 'ja',
};

/** 按思源界面语言返回对应文案，支持 en、zh-CN、zh-TW、ja */
export function t(key: string): string {
    const entry = MESSAGES[key];
    if (!entry) {
        return key;
    }
    const lang = window.siyuan?.config?.appearance?.lang ?? 'en' as string;
    const localeKey = LANG_MAP[lang] ?? 'en';
    return entry[localeKey] ?? entry.en;
}
