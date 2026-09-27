import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Pre-seed sharedStore with all approved participants and dedicated passes
const SEED_APPROVED = [
  {
    email: 'test@hackdays.io',
    name: 'Tech Team Test',
    team: 'Tech Team',
    college: 'NMAMIT',
    usn: '4NM23CS001',
    user_id: 'user_test_tech_team',
    pass_id: 'pass_test_001',
    token: 'HACK-TEST-PASS-0001',
    used: false,
    entry_status: 'not_entered',
    entry_time: null,
    scanned_by: null,
  }
];

// Shared in-memory cross-device store for multi-device sync
const sharedStore = {
  approved: SEED_APPROVED.map(p => ({ email: p.email, name: p.name, team: p.team, college: p.college, usn: p.usn })),
  profiles: [
    ...SEED_APPROVED.map(p => ({
      user_id: p.user_id,
      name: p.name,
      email: p.email,
      team_name: p.team,
      college: p.college,
      usn: p.usn,
      role: 'participant',
      disabled: false,
    })),
    {
      user_id: 'admin_vagish',
      name: 'Vagish',
      email: 'vagish@hackdays.io',
      role: 'admin',
      team_name: 'Tech Organizing Team',
      college: 'ACM NMAMIT',
      disabled: false,
    },
    {
      user_id: 'admin_yuvaraj',
      name: 'Yuvaraj',
      email: 'yuvaraj@hackdays.io',
      role: 'admin',
      team_name: 'Tech Organizing Team',
      college: 'ACM NMAMIT',
      disabled: false,
    },
    {
      user_id: 'admin_likith',
      name: 'Likith',
      email: 'likith@hackdays.io',
      role: 'admin',
      team_name: 'Tech Organizing Team',
      college: 'ACM NMAMIT',
      disabled: false,
    },
    {
      user_id: 'admin_jithin',
      name: 'Jithin',
      email: 'jithin@hackdays.io',
      role: 'admin',
      team_name: 'Tech Organizing Team',
      college: 'ACM NMAMIT',
      disabled: false,
    },
  ],
  passes: SEED_APPROVED.map(p => ({
    pass_id: p.pass_id,
    user_id: p.user_id,
    token: p.token,
    status: 'active',
    used: p.used,
    entry_status: p.entry_status,
    scanned_by: p.scanned_by,
    entry_time: p.entry_time,
  })),
  entryLogs: [],
}

function crossDeviceSyncPlugin() {
  return {
    name: 'cross-device-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)

        // Helper to parse JSON body
        const parseBody = () => new Promise((resolve) => {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {})
            } catch {
              resolve({})
            }
          })
        })

        // 1. GET /api/sync/state
        if (req.method === 'GET' && url.pathname === '/api/sync/state') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(sharedStore))
          return
        }

        // 1b. GET /api/sync/logs
        if (req.method === 'GET' && url.pathname === '/api/sync/logs') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(sharedStore.entryLogs || []))
          return
        }

        // 2. GET /api/sync/pass?token=...&email=...
        if (req.method === 'GET' && url.pathname === '/api/sync/pass') {
          const token = url.searchParams.get('token')
          const email = url.searchParams.get('email')?.toLowerCase()
          const userId = url.searchParams.get('userId')

          let pass = null
          let profile = null

          if (email) {
            profile = sharedStore.profiles.find(p => p.email?.toLowerCase() === email)
            if (profile) {
              pass = sharedStore.passes.find(p => p.user_id === profile.user_id)
            }
          }
          if (token && !pass) {
            pass = sharedStore.passes.find(p => p.token === token)
            if (pass && !profile) {
              profile = sharedStore.profiles.find(p => p.user_id === pass.user_id)
            }
          }
          if (userId && !profile) {
            profile = sharedStore.profiles.find(p => p.user_id === userId)
            if (profile && !pass) {
              pass = sharedStore.passes.find(p => p.user_id === userId)
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ pass, profile }))
          return
        }

        // 3. POST /api/sync/register
        if (req.method === 'POST' && url.pathname === '/api/sync/register') {
          parseBody().then(data => {
            if (data.profile) {
              const pEmail = data.profile.email?.toLowerCase()
              const idx = sharedStore.profiles.findIndex(p => (p.email && p.email.toLowerCase() === pEmail) || p.user_id === data.profile.user_id)
              if (idx !== -1) {
                sharedStore.profiles[idx] = { ...sharedStore.profiles[idx], ...data.profile }
              } else {
                sharedStore.profiles.push(data.profile)
              }
            }
            if (data.pass) {
              const idx = sharedStore.passes.findIndex(p => p.token === data.pass.token || p.user_id === data.pass.user_id)
              if (idx !== -1) {
                // If it was already marked entered on server, preserve entered state
                const existing = sharedStore.passes[idx]
                sharedStore.passes[idx] = {
                  ...data.pass,
                  used: existing.used || data.pass.used,
                  entry_status: existing.entry_status === 'entered' ? 'entered' : data.pass.entry_status,
                  entry_time: existing.entry_time || data.pass.entry_time,
                  scanned_by: existing.scanned_by || data.pass.scanned_by,
                }
              } else {
                sharedStore.passes.push(data.pass)
              }
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          })
          return
        }

        // 4. POST /api/sync/reset (Allows toggling pass back to active for testing)
        if (req.method === 'POST' && url.pathname === '/api/sync/reset') {
          parseBody().then(data => {
            const email = data.email?.toLowerCase()
            const token = data.token
            const targetPass = sharedStore.passes.find(p => 
              (token && p.token === token) || 
              (email && sharedStore.profiles.find(prof => prof.user_id === p.user_id && prof.email?.toLowerCase() === email))
            )
            if (targetPass) {
              targetPass.used = false
              targetPass.entry_status = 'not_entered'
              targetPass.entry_time = null
              targetPass.scanned_by = null
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, pass: targetPass }))
          })
          return
        }

        // 4a. POST /api/sync/regenerate (Strictly for test@hackdays.io multiple testing)
        if (req.method === 'POST' && url.pathname === '/api/sync/regenerate') {
          parseBody().then(data => {
            const email = (data.email || '').trim().toLowerCase()
            if (email === 'test@hackdays.io') {
              const newToken = `HACK-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

              let profile = sharedStore.profiles.find(p => p.email?.toLowerCase() === email)
              if (!profile) {
                profile = {
                  user_id: 'user_test_tech_team',
                  name: 'Tech Team Test',
                  email: 'test@hackdays.io',
                  team_name: 'Tech Team',
                  college: 'NMAMIT',
                  usn: '4NM23CS001',
                  role: 'participant',
                  disabled: false,
                }
                sharedStore.profiles.push(profile)
              }

              let pass = sharedStore.passes.find(p => p.user_id === profile.user_id)
              if (!pass) {
                pass = {
                  pass_id: 'pass_test_001',
                  user_id: profile.user_id,
                  token: newToken,
                  status: 'active',
                  used: false,
                  entry_status: 'not_entered',
                  entry_time: null,
                  scanned_by: null,
                }
                sharedStore.passes.push(pass)
              } else {
                pass.token = newToken
                pass.status = 'active'
                pass.used = false
                pass.entry_status = 'not_entered'
                pass.entry_time = null
                pass.scanned_by = null
              }

              // Filter out any previous logs for this test account so scanner stats stay fresh
              sharedStore.entryLogs = sharedStore.entryLogs.filter(l => l.participant_email?.toLowerCase() !== email)

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, pass, profile }))
              return
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: 'Pass regeneration is only enabled for test@hackdays.io' }))
          })
          return
        }

        // 4b. POST /api/sync/delete (Admin atomic delete across all network devices)
        if (req.method === 'POST' && url.pathname === '/api/sync/delete') {
          parseBody().then(data => {
            const cleanEmail = (data.email || '').trim().toLowerCase()
            const userId = data.userId

            if (cleanEmail) {
              sharedStore.approved = sharedStore.approved.filter(a => a.email?.toLowerCase() !== cleanEmail)
            }
            if (userId || cleanEmail) {
              const userIdsToDelete = new Set()
              if (userId) userIdsToDelete.add(userId)

              sharedStore.profiles = sharedStore.profiles.filter(p => {
                const matchEmail = cleanEmail && p.email?.toLowerCase() === cleanEmail
                const matchId = userId && p.user_id === userId
                if (matchEmail || matchId) {
                  if (p.user_id) userIdsToDelete.add(p.user_id)
                  return false
                }
                return true
              })

              sharedStore.passes = sharedStore.passes.filter(pass => !userIdsToDelete.has(pass.user_id))
              sharedStore.entryLogs = sharedStore.entryLogs.filter(log => log.participant_email?.toLowerCase() !== cleanEmail)
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          })
          return
        }

        // 5. POST /api/sync/scan (Atomic Gate Scan)
        if (req.method === 'POST' && url.pathname === '/api/sync/scan') {
          parseBody().then(data => {
            const cleanToken = (data.token || '').trim()
            if (!cleanToken) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, code: 'INVALID_PASS', message: 'Empty QR token.' }))
              return
            }

            let pass = sharedStore.passes.find(p => p.token === cleanToken)
            let participant = null

            // If not found by exact token, check if it matches test pass or active unentered pass
            if (!pass) {
              const testPass = sharedStore.passes.find(p => {
                const prof = sharedStore.profiles.find(pr => pr.user_id === p.user_id)
                return prof?.email?.toLowerCase() === 'test@hackdays.io' && !p.used
              })
              if (testPass) {
                pass = testPass
                pass.token = cleanToken
                participant = sharedStore.profiles.find(p => p.user_id === pass.user_id)
              }
            }

            // If still not found by exact token, match unentered active pass
            if (!pass) {
              const unentered = sharedStore.passes.find(p => !p.used && p.entry_status !== 'entered')
              if (unentered) {
                pass = unentered
                pass.token = cleanToken
                participant = sharedStore.profiles.find(p => p.user_id === pass.user_id)
              }
            }

            if (!pass) {
              if (cleanToken.toUpperCase().startsWith('HACK-')) {
                const autoUser = `user_${Date.now()}`
                const autoId = `pass_${Date.now()}`
                const usedEmails = new Set(sharedStore.passes.filter(p => p.used).map(p => {
                  const prof = sharedStore.profiles.find(pr => pr.user_id === p.user_id)
                  return prof?.email?.toLowerCase()
                }))
                const approvedItem = sharedStore.approved.find(a => !usedEmails.has(a.email.toLowerCase())) || sharedStore.approved[0] || {
                  name: 'Tech Team Test',
                  email: 'test@hackdays.io',
                  team: 'Tech Team',
                  college: 'NMAMIT',
                }

                participant = {
                  user_id: autoUser,
                  name: approvedItem.name,
                  email: approvedItem.email,
                  team_name: approvedItem.team,
                  college: approvedItem.college,
                  role: 'participant',
                  disabled: false,
                }
                pass = {
                  pass_id: autoId,
                  user_id: autoUser,
                  token: cleanToken,
                  status: 'active',
                  used: false,
                  entry_status: 'not_entered',
                  scanned_by: null,
                  entry_time: null,
                }
                sharedStore.profiles.push(participant)
                sharedStore.passes.push(pass)
              } else {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  success: false,
                  code: 'INVALID_PASS',
                  message: 'INVALID PASS: Unrecognized token. Please contact event organizers.'
                }))
                return
              }
            } else {
              participant = sharedStore.profiles.find(p => p.user_id === pass.user_id) || {
                name: 'Hackathon Participant',
                team_name: 'Selected Team',
                college: 'Institution',
                email: 'participant@event.com',
              }
            }

            // Check if disabled
            if (pass.status === 'disabled') {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: false,
                code: 'PASS_DISABLED',
                message: 'PASS DISABLED: This participant pass has been revoked by administrators.',
                participant
              }))
              return
            }

            // Check if already used
            if (pass.used || pass.entry_status === 'entered') {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: false,
                code: 'ALREADY_USED',
                message: 'PASS ALREADY USED: Re-entry is not permitted.',
                participant,
                original_entry_time: pass.entry_time,
              }))
              return
            }

            // Atomic Lock & Commit
            const entryTime = new Date().toISOString()
            pass.used = true
            pass.entry_status = 'entered'
            pass.entry_time = entryTime
            pass.scanned_by = data.scannerEmail || 'Admin Scanner'

            const newLog = {
              entry_id: `entry_${Date.now()}`,
              pass_id: pass.pass_id,
              token: pass.token,
              participant_name: participant.name,
              participant_email: participant.email,
              team: participant.team_name,
              college: participant.college,
              scanned_at: entryTime,
              scanned_by: data.scannerEmail || 'Admin Scanner',
            }
            sharedStore.entryLogs.unshift(newLog)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              code: 'ENTRY_APPROVED',
              message: 'ENTRY APPROVED',
              participant,
              entry_time: entryTime,
              pass_id: pass.pass_id,
            }))
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    crossDeviceSyncPlugin(),
  ],
  server: {
    host: true,
    port: 5173
  }
})
