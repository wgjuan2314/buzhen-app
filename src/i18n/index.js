import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  'zh-CN': {
    translation: {
      stage_name: 'stage_name',
      placeholder: '输入消息…',
      send: '发送',
      language: '语言',
      connecting_tip: '（尚未填入 Dify 设置时，这里会失败是正常的）',
    },
  },
  en: {
    translation: {
      stage_name: 'stage_name',
      placeholder: 'Type a message…',
      send: 'Send',
      language: 'Language',
      connecting_tip: '(It is expected to fail until Dify config is filled in.)',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-CN',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
