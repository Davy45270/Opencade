# Politique de sécurité

Opencade est un site statique sans serveur, sans compte et sans collecte de
données : il ne stocke que des scores et des préférences dans le `localStorage`
du navigateur.

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique**. Utilisez le signalement privé de
GitHub : onglet **Security** du dépôt, puis **Report a vulnerability**
([lien direct](https://github.com/Davy45270/Opencade/security/advisories/new)).

Indiquez la version ou le commit concerné, le navigateur, et les étapes pour
reproduire. Vous recevrez une réponse dès que possible ; le projet étant
maintenu bénévolement, aucun délai n'est garanti.

## Versions prises en charge

Seule la dernière version de la branche `main` (celle publiée sur GitHub Pages)
reçoit des correctifs.

## Hors périmètre

Le crochet de test exposé avec le paramètre `?test=1` permet de modifier l'état
d'une partie locale : c'est voulu et ce n'est pas une vulnérabilité.
