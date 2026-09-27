// CSV Parser and Validator for Participant Import (Supports Single Participants and Teams of 2)
export function parseParticipantCSV(csvText) {
  const lines = csvText.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      validRows: [],
      invalidRows: [{ row: 0, raw: '', reason: 'CSV file is empty or missing data rows' }],
      headers: [],
    };
  }

  // Parse header
  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  
  // Detect if this is a Team of 2 formatted CSV
  const mem1NameIdx = rawHeaders.findIndex(h => (h.includes('1') && h.includes('name')) || h.includes('leader name') || h.includes('member 1'));
  const mem1EmailIdx = rawHeaders.findIndex(h => (h.includes('1') && h.includes('email')) || h.includes('leader email') || h.includes('email 1'));
  const mem1UsnIdx = rawHeaders.findIndex(h => (h.includes('1') && (h.includes('usn') || h.includes('roll') || h.includes('reg'))) || h.includes('leader usn'));
  
  const mem2NameIdx = rawHeaders.findIndex(h => (h.includes('2') && h.includes('name')) || h.includes('member 2 name') || h.includes('member 2'));
  const mem2EmailIdx = rawHeaders.findIndex(h => (h.includes('2') && h.includes('email')) || h.includes('member 2 email') || h.includes('email 2'));
  const mem2UsnIdx = rawHeaders.findIndex(h => (h.includes('2') && (h.includes('usn') || h.includes('roll') || h.includes('reg'))) || h.includes('member 2 usn'));
  
  const isTeamOfTwoCSV = (mem1EmailIdx !== -1 && mem2EmailIdx !== -1);

  // Standard column indices (fallback if not team-of-two specific)
  const nameIdx = rawHeaders.findIndex(h => h === 'name' || h.includes('participant name') || h.includes('full name') || h.includes('student name'));
  const emailIdx = rawHeaders.findIndex(h => h === 'email' || h.includes('mail id') || h.includes('email address'));
  const usnIdx = rawHeaders.findIndex(h => h.includes('usn') || h.includes('roll') || h.includes('reg_no') || h.includes('seat'));
  const teamIdx = rawHeaders.findIndex(h => h.includes('team') || h.includes('group'));
  const collegeIdx = rawHeaders.findIndex(h => h.includes('college') || h.includes('institution') || h.includes('univ') || h.includes('campus'));
  const phoneIdx = rawHeaders.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));

  if (!isTeamOfTwoCSV && emailIdx === -1) {
    return {
      validRows: [],
      invalidRows: [{ row: 1, raw: lines[0], reason: "Missing required 'email' column header." }],
      headers: rawHeaders,
    };
  }

  const validRows = [];
  const invalidRows = [];
  const seenEmailsInFile = new Set();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split by comma respecting quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] || '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      matches.push(val);
      if (matches.length > 30) break;
    }

    const cols = matches.length >= rawHeaders.length ? matches : rawLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const teamName = teamIdx !== -1 && cols[teamIdx] ? cols[teamIdx].trim() : 'Team ' + i;
    const college = collegeIdx !== -1 && cols[collegeIdx] ? cols[collegeIdx].trim() : 'NMAMIT';

    if (isTeamOfTwoCSV) {
      // Parse Member 1
      const m1Name = mem1NameIdx !== -1 && cols[mem1NameIdx] ? cols[mem1NameIdx].trim() : 'Member 1';
      const m1Email = cols[mem1EmailIdx] ? cols[mem1EmailIdx].trim().toLowerCase() : '';
      
      // Parse Member 2
      const m2Name = mem2NameIdx !== -1 && cols[mem2NameIdx] ? cols[mem2NameIdx].trim() : 'Member 2';
      const m2Email = cols[mem2EmailIdx] ? cols[mem2EmailIdx].trim().toLowerCase() : '';

      if (m1Email) {
        if (!emailRegex.test(m1Email)) {
          invalidRows.push({ row: i + 1, raw: rawLine, reason: `Member 1 email invalid: "${m1Email}"` });
        } else if (seenEmailsInFile.has(m1Email)) {
          invalidRows.push({ row: i + 1, raw: rawLine, reason: `Duplicate email: "${m1Email}"` });
        } else {
          seenEmailsInFile.add(m1Email);
          const m1Usn = mem1UsnIdx !== -1 && cols[mem1UsnIdx] ? cols[mem1UsnIdx].trim().toUpperCase() : (usnIdx !== -1 && cols[usnIdx] ? cols[usnIdx].trim().toUpperCase() : '');
          validRows.push({
            name: m1Name,
            email: m1Email,
            team: teamName,
            college: college,
            usn: m1Usn,
            phone: phoneIdx !== -1 ? cols[phoneIdx] || '' : '',
          });
        }
      }

      if (m2Email) {
        if (!emailRegex.test(m2Email)) {
          invalidRows.push({ row: i + 1, raw: rawLine, reason: `Member 2 email invalid: "${m2Email}"` });
        } else if (seenEmailsInFile.has(m2Email)) {
          invalidRows.push({ row: i + 1, raw: rawLine, reason: `Duplicate email: "${m2Email}"` });
        } else {
          seenEmailsInFile.add(m2Email);
          const m2Usn = mem2UsnIdx !== -1 && cols[mem2UsnIdx] ? cols[mem2UsnIdx].trim().toUpperCase() : '';
          validRows.push({
            name: m2Name,
            email: m2Email,
            team: teamName,
            college: college,
            usn: m2Usn,
            phone: '',
          });
        }
      }
    } else {
      // Standard Single-Member per Row
      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : 'Participant';
      const email = cols[emailIdx] ? cols[emailIdx].trim().toLowerCase() : '';
      const phone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : '';
      const usn = usnIdx !== -1 && cols[usnIdx] ? cols[usnIdx].trim().toUpperCase() : '';

      if (!email) {
        invalidRows.push({ row: i + 1, raw: rawLine, reason: 'Email field is empty' });
        continue;
      }

      if (!emailRegex.test(email)) {
        invalidRows.push({ row: i + 1, raw: rawLine, reason: `Malformed email format: "${email}"` });
        continue;
      }

      if (seenEmailsInFile.has(email)) {
        invalidRows.push({ row: i + 1, raw: rawLine, reason: `Duplicate email within CSV: "${email}"` });
        continue;
      }

      seenEmailsInFile.add(email);
      validRows.push({
        email,
        name: name || 'Participant',
        team: teamName || 'Individual',
        college: college || 'NMAMIT',
        usn: usn,
        phone: phone || '',
      });
    }
  }

  return {
    validRows,
    invalidRows,
    headers: rawHeaders,
    isTeamOfTwo: isTeamOfTwoCSV,
  };
}
