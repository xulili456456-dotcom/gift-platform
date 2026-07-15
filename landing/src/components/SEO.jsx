import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

export default function SEO({ title, description }) {
  const { t } = useTranslation()
  const appName = t('app.name')
  const pageTitle = title ? `${title} - ${appName}` : `${appName} - ${t('app.slogan')}`

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description || t('app.slogan')} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description || t('app.slogan')} />
    </Helmet>
  )
}
