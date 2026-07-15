import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function SEO({ title, description }) {
  const { t } = useTranslation()
  const appName = t('app.name')
  const pageTitle = title ? `${title} - ${appName}` : `${appName} - ${t('app.slogan')}`

  useEffect(() => {
    document.title = pageTitle
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', description || t('app.slogan'))
    }
  }, [pageTitle, description, t])

  return null
}
