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
