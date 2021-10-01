import {Schema, Session} from '@alinea/core'
import {Auth} from '@alinea/core/Auth'
import {FavIcon, Viewport} from '@alinea/ui'
import {Sidebar} from '@alinea/ui/Sidebar'
import {getRandomColor} from '@alinea/ui/util/GetRandomColor'
//import 'preact/debug'
import {Suspense, useState} from 'react'
import {Helmet} from 'react-helmet'
import {MdPerson, MdSearch, MdSettings} from 'react-icons/md'
import {QueryClient, QueryClientProvider} from 'react-query'
import {Route} from 'react-router'
import {HashRouter} from 'react-router-dom'
// Todo: bundle this properly
import './css/fonts.css'
import {DashboardProvider, useDashboard} from './hook/UseDashboard'
import {SessionProvider} from './hook/UseSession'
import {ContentTree} from './view/ContentTree'
import {EntryEdit} from './view/EntryEdit'
import {Toolbar} from './view/Toolbar'

function AppAuthenticated() {
  const {name, color} = useDashboard()
  return (
    <>
      <Helmet>
        <title>{name}</title>
      </Helmet>
      <Toolbar />
      <div style={{flex: '1', display: 'flex', minHeight: 0}}>
        <Sidebar.Root>
          <Sidebar.Menu>
            <Sidebar.Menu.Item>
              <MdSearch />
            </Sidebar.Menu.Item>
            <Sidebar.Menu.Item>
              <MdSettings />
            </Sidebar.Menu.Item>
            <Sidebar.Menu.Item>
              <MdPerson />
            </Sidebar.Menu.Item>
          </Sidebar.Menu>
          <Sidebar.List>
            <ContentTree />
          </Sidebar.List>
        </Sidebar.Root>
        <div style={{width: '100%'}}>
          <Route path="/:slug*">
            {({match}) => {
              return (
                <Suspense fallback={null}>
                  <EntryEdit path={match?.params.slug!} />
                </Suspense>
              )
            }}
          </Route>
        </div>
      </div>
      <div style={{height: '22px', background: 'var(--outline)'}}></div>
    </>
  )
}

type AppRootProps = {
  session: Session | undefined
  setSession: (session: Session | undefined) => void
}

function AppRoot({session, setSession}: AppRootProps) {
  const {color, name, auth: Auth} = useDashboard()
  const inner = session ? (
    <AppAuthenticated />
  ) : (
    <Auth setSession={setSession} />
  )
  return (
    <Viewport color={color}>
      <FavIcon color={color} />
      {inner}
    </Viewport>
  )
}

export type AppProps = {
  name: string
  schema: Schema
  apiUrl: string
  auth: Auth.View
  color?: string
}

export function App(props: AppProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [session, setSession] = useState<Session | undefined>()
  return (
    <DashboardProvider
      value={{...props, color: props.color || getRandomColor(props.name)}}
    >
      <HashRouter>
        <SessionProvider value={session}>
          <QueryClientProvider client={queryClient}>
            <AppRoot session={session} setSession={setSession} />
          </QueryClientProvider>
        </SessionProvider>
      </HashRouter>
    </DashboardProvider>
  )
}
