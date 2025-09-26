import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <meta name="application-name" content="Learner Club" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Learner Club" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#1677ff" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#1677ff" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://pwagoogle.vercel.app" />
        <meta name="twitter:title" content="Learner Club" />
        <meta name="twitter:description" content="34天财务管理挑战，养成理财好习惯" />
        <meta name="twitter:image" content="https://pwagoogle.vercel.app/icons/icon-192.png" />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Learner Club" />
        <meta property="og:description" content="34天财务管理挑战，养成理财好习惯" />
        <meta property="og:site_name" content="Learner Club" />
        <meta property="og:url" content="https://pwagoogle.vercel.app" />
        <meta property="og:image" content="https://pwagoogle.vercel.app/icons/icon-192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}