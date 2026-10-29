import { registerSW } from 'virtual:pwa-register';

// Ordinary E2E contexts remain independent; the offline E2E opts in explicitly.
const params = new URLSearchParams(location.search);
if (params.get('test') !== '1' || params.get('pwa') === '1') {
    registerSW({
        onNeedRefresh() {
            const notice = document.querySelector<HTMLElement>('#pwa-update');
            if (notice) {
                notice.textContent = 'Nouvelle version disponible — elle s’appliquera au prochain lancement, après fermeture des fenêtres Opencade.';
                notice.hidden = false;
            }
        },
    });
}
