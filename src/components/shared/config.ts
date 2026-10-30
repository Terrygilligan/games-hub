// Per-project adapter for the shared footer bar — the ONLY file in
// components/shared/ that differs between hubs. Maps the portable
// FooterBarConfig contract onto this project's i18n/services/libs.
import { t } from '../../i18n'
import { getPlayerId } from '../../features/games/services/playerIdentity'
import { fetchRating, submitRating, submitReview } from '../../lib/ratings'
import {
  clearAllData,
  exportBackup,
  importBackup,
  lastBackupAt,
  requestPersistence,
  storageEstimate,
} from '../../lib/backup'
import BugReport from '../BugReport'
import FeatureSuggest from '../FeatureSuggest'
import SettingsMenu from '../SettingsMenu'
import type { FooterBarConfig } from './types'

export const footerConfig: FooterBarConfig = {
  t: (key, vars) => t(`footer.${key}`, vars),
  storagePrefix: 'games-hub.',
  coffeeUrl:
    'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=2Q8NHQCFDDLKQ&item_name=Tip&no_shipping=1&currency_code=EUR',
  playerId: getPlayerId,
  submitRating,
  fetchRating,
  submitReview,
  backup: {
    exportBackup,
    importBackup,
    clearAllData,
    lastBackupAt,
    storageEstimate,
    requestPersistence,
  },
  modals: {
    BugReport,
    FeatureSuggest,
    Settings: SettingsMenu,
  },
}
