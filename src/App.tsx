import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { availableTimes, fetchAvailability, type AvailabilityRules } from './availability';
import { addDays, formatDate, money, spaces, times, type SlotTime, type Space, type SpaceId } from './domain';
import { readBookings, saveBooking, SlotConflictError, type Booking } from './storage';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rules: AvailabilityRules };

type FormData = { name: string; email: string; attendees: string; purpose: string };
type FieldErrors = Partial<Record<keyof FormData, string>>;

function RoomArt({ id }: { id: SpaceId }) {
  return (
    <div className={`room-art room-art--${id}`} aria-hidden="true">
      <div className="room-art__wall" />
      <div className="room-art__window" />
      <div className="room-art__table" />
      <div className="room-art__chair room-art__chair--one" />
      <div className="room-art__chair room-art__chair--two" />
      <div className="room-art__chair room-art__chair--three" />
      <div className="room-art__plant" />
      <span className="room-art__caption">FLOOR / {id.toUpperCase()}</span>
    </div>
  );
}

function SpaceCard({ space, selected, onSelect }: { space: Space; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`space-card${selected ? ' space-card--selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <RoomArt id={space.id} />
      <span className="space-card__body">
        <span className="space-card__eyebrow">RUANG {space.number} <span aria-hidden="true">↗</span></span>
        <span className="space-card__title">{space.name}</span>
        <span className="space-card__description">{space.description}</span>
        <span className="space-card__meta"><span>Hingga {space.capacity} orang</span><span>{money(space.rate)} / 2 jam</span></span>
      </span>
    </button>
  );
}

function validate(form: FormData, capacity: number): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) errors.name = 'Masukkan nama lengkap minimal 2 karakter.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Masukkan alamat email yang valid.';
  const attendees = Number(form.attendees);
  if (!Number.isInteger(attendees) || attendees < 1 || attendees > capacity) {
    errors.attendees = `Jumlah peserta harus 1–${capacity} orang.`;
  }
  if (form.purpose.trim().length < 3) errors.purpose = 'Jelaskan keperluan minimal 3 karakter.';
  return errors;
}

function bookingId(): string {
  return `SL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export default function App() {
  const [spaceId, setSpaceId] = useState<SpaceId>('atelier');
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState<SlotTime | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>(readBookings);
  const [form, setForm] = useState<FormData>({ name: '', email: '', attendees: '2', purpose: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const minDate = useMemo(() => addDays(1), []);
  const maxDate = useMemo(() => addDays(14), []);
  const space = spaces.find(item => item.id === spaceId)!;
  const slots = load.status === 'ready' ? availableTimes(load.rules, spaceId, date, bookings) : [];

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    fetchAvailability(controller.signal)
      .then(rules => setLoad({ status: 'ready', rules }))
      .catch(error => {
        if (!controller.signal.aborted) setLoad({ status: 'error', message: error instanceof Error ? error.message : 'Jadwal belum dapat dimuat.' });
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const sync = () => setBookings(readBookings());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function selectSpace(next: SpaceId) {
    setSpaceId(next);
    setTime(null);
    setMessage('');
    setErrors({});
    setForm(previous => ({ ...previous, attendees: String(Math.min(Number(previous.attendees) || 1, spaces.find(item => item.id === next)!.capacity)) }));
  }

  function selectDate(next: string) {
    if (next < minDate || next > maxDate) return;
    setDate(next);
    setTime(null);
    setMessage('');
  }

  function updateField(field: keyof FormData, value: string) {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (load.status !== 'ready' || !time || !availableTimes(load.rules, spaceId, date, readBookings()).includes(time)) {
      setMessage('Pilih slot waktu yang masih tersedia sebelum melanjutkan.');
      setTime(null);
      setBookings(readBookings());
      document.getElementById('pilih-waktu')?.focus();
      return;
    }

    const nextErrors = validate(form, space.capacity);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setMessage('Periksa kembali detail reservasi yang ditandai.');
      requestAnimationFrame(() => document.getElementById(firstError)?.focus());
      return;
    }

    const booking: Booking = {
      id: bookingId(), spaceId, date, time,
      name: form.name.trim(), email: form.email.trim(),
      attendees: Number(form.attendees), purpose: form.purpose.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      saveBooking(booking);
      setBookings(readBookings());
      setConfirmed(booking);
      requestAnimationFrame(() => document.getElementById('konfirmasi-title')?.focus());
    } catch (error) {
      if (error instanceof SlotConflictError) {
        setBookings(readBookings());
        setTime(null);
        setMessage(error.message);
      } else {
        setMessage('Reservasi tidak dapat disimpan di browser ini. Periksa izin penyimpanan lalu coba lagi.');
      }
    }
  }

  function startAgain() {
    setConfirmed(null);
    setTime(null);
    setErrors({});
    setMessage('');
    setForm({ name: '', email: '', attendees: '2', purpose: '' });
    document.getElementById('reservasi')?.scrollIntoView({ behavior: 'smooth' });
  }

  const confirmedSpace = confirmed ? spaces.find(item => item.id === confirmed.spaceId)! : null;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#konten">Lewati ke konten</a>
      <header className="site-header">
        <a className="brand" href="#atas" aria-label="Sela, kembali ke atas"><span className="brand-mark" aria-hidden="true">s.</span><span>sela<span className="brand-dot">.</span></span></a>
        <nav aria-label="Navigasi utama" className="site-nav">
          <a href="#ruang">Ruang</a><a href="#cara-kerja">Cara kerja</a><a className="nav-cta" href="#reservasi">Reservasi <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main id="konten">
        <section className="hero" id="atas" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> RUANG UNTUK BERKOLABORASI</p>
            <h1 id="hero-title">Ruang yang pas untuk <em>ide yang bergerak.</em></h1>
            <p className="hero-lead">Dari percakapan kecil sampai gagasan bersama, temukan ruang yang memberi pekerjaan Anda tempat untuk berkembang.</p>
            <div className="hero-actions"><a className="button button--lime" href="#reservasi">Pilih jadwal <span aria-hidden="true">↗</span></a><span>Konsep interaktif · bukan layanan reservasi nyata</span></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual__grid" />
            <span className="hero-visual__vertical">THE SPACE BETWEEN IDEAS</span>
            <div className="hero-visual__circle"><span>SELA<br />STUDIO</span><small>01 / 03</small></div>
            <div className="hero-visual__note"><span>OPEN SPACE</span><strong>Make room<br /><i>for more.</i></strong><span>09:00 — 17:00</span></div>
          </div>
          <div className="hero-bottom"><span>DESIGNED TO GATHER</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>

        <section className="section spaces-section" id="ruang" aria-labelledby="spaces-title">
          <div className="section-heading"><div><p className="eyebrow eyebrow--dark">01 / PILIH RUANG</p><h2 id="spaces-title">Setiap pertemuan<br />punya <em>tempatnya.</em></h2></div><p>Tiga karakter ruang untuk tiga cara bekerja. Pilih yang paling sesuai dengan orang dan ide yang Anda bawa.</p></div>
          <div className="space-grid">{spaces.map(item => <SpaceCard key={item.id} space={item} selected={spaceId === item.id} onSelect={() => selectSpace(item.id)} />)}</div>
        </section>

        <section className="process-section" id="cara-kerja" aria-labelledby="process-title">
          <div className="process-inner"><p className="eyebrow eyebrow--dark">SEDERHANA DARI AWAL</p><h2 id="process-title">Tiga langkah.<br /><em>Satu ruang yang tepat.</em></h2><ol className="process-list"><li><span>01</span><strong>Pilih ruang</strong><p>Sesuaikan ukuran dan fasilitas dengan kebutuhan.</p></li><li><span>02</span><strong>Tentukan waktu</strong><p>Lihat slot demo yang tersedia dalam dua minggu ke depan.</p></li><li><span>03</span><strong>Simpan rencana</strong><p>Dapatkan ringkasan lokal di browser Anda.</p></li></ol></div>
        </section>

        <section className="section booking-section" id="reservasi" aria-labelledby="booking-title">
          <div className="section-heading booking-heading"><div><p className="eyebrow eyebrow--dark">02 / ATUR JADWAL</p><h2 id="booking-title">Mari buat<br /><em>ruang untuk bertemu.</em></h2></div><p>Ini adalah simulasi interaktif. Data reservasi hanya tersimpan di browser Anda; tidak ada ruang atau email sungguhan yang dipesan.</p></div>

          {confirmed && confirmedSpace ? (
            <div className="confirmation" role="status">
              <span className="confirmation__icon" aria-hidden="true">✓</span><p className="eyebrow eyebrow--dark">RINGKASAN TERSIMPAN DI BROWSER</p>
              <h3 id="konfirmasi-title" tabIndex={-1}>Rencana Anda <em>punya tempat.</em></h3>
              <p>Ini konfirmasi demo, bukan pemesanan tempat atau pengiriman email.</p>
              <dl><div><dt>Nomor demo</dt><dd>{confirmed.id}</dd></div><div><dt>Ruang</dt><dd>{confirmedSpace.name}</dd></div><div><dt>Jadwal</dt><dd>{formatDate(confirmed.date)}, {confirmed.time}–{String(Number(confirmed.time.slice(0, 2)) + 2).padStart(2, '0')}:00</dd></div><div><dt>Atas nama</dt><dd>{confirmed.name}</dd></div></dl>
              <button type="button" className="button button--dark" onClick={startAgain}>Buat rencana lain <span aria-hidden="true">↗</span></button>
            </div>
          ) : (
            <div className="booking-layout">
              <div className="booking-main">
                <div className="booking-panel">
                  <div className="panel-heading"><span>01</span><div><h3>Waktu yang cocok</h3><p>Setiap slot berlangsung selama dua jam.</p></div></div>
                  <label className="input-label" htmlFor="booking-date">Tanggal kunjungan</label>
                  <input id="booking-date" className="date-input" type="date" min={minDate} max={maxDate} value={date} onChange={event => selectDate(event.target.value)} />
                  <p className="field-help">Pilih antara besok hingga 14 hari ke depan.</p>
                  <h4 id="pilih-waktu" tabIndex={-1}>Pilih jam mulai</h4>
                  {load.status === 'loading' && <div className="state-box" role="status">Memuat jadwal demo…</div>}
                  {load.status === 'error' && <div className="state-box state-box--error" role="alert"><p>{load.message}</p><button type="button" onClick={() => setReload(value => value + 1)}>Coba lagi</button></div>}
                  {load.status === 'ready' && (slots.length ? <div className="slot-grid" role="group" aria-label="Jam mulai tersedia">{times.map(slot => {
                    const available = slots.includes(slot);
                    return <button key={slot} type="button" className={`slot${time === slot ? ' slot--selected' : ''}`} disabled={!available} aria-pressed={available ? time === slot : undefined} onClick={() => { setTime(slot); setMessage(''); }}><strong>{slot}</strong><small>{available ? 'Tersedia' : 'Terisi'}</small></button>;
                  })}</div> : <div className="state-box" role="status">Belum ada slot demo untuk ruang dan tanggal ini. Coba tanggal lain.</div>)}
                </div>

                <form className="booking-panel details-panel" onSubmit={submit} noValidate>
                  <div className="panel-heading"><span>02</span><div><h3>Detail pertemuan</h3><p>Isi seperlunya untuk membuat ringkasan demo.</p></div></div>
                  <div className="field-grid">
                    <div className="field"><label htmlFor="name">Nama lengkap</label><input id="name" autoComplete="name" value={form.name} onChange={event => updateField('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} placeholder="Nama Anda" />{errors.name && <small id="name-error" className="field-error">{errors.name}</small>}</div>
                    <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={form.email} onChange={event => updateField('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="nama@email.com" />{errors.email && <small id="email-error" className="field-error">{errors.email}</small>}</div>
                    <div className="field"><label htmlFor="attendees">Jumlah peserta</label><input id="attendees" type="number" min="1" max={space.capacity} value={form.attendees} onChange={event => updateField('attendees', event.target.value)} aria-invalid={!!errors.attendees} aria-describedby={errors.attendees ? 'attendees-error' : undefined} />{errors.attendees && <small id="attendees-error" className="field-error">{errors.attendees}</small>}</div>
                    <div className="field"><label htmlFor="purpose">Keperluan</label><input id="purpose" value={form.purpose} onChange={event => updateField('purpose', event.target.value)} aria-invalid={!!errors.purpose} aria-describedby={errors.purpose ? 'purpose-error' : undefined} placeholder="Contoh: diskusi tim" />{errors.purpose && <small id="purpose-error" className="field-error">{errors.purpose}</small>}</div>
                  </div>
                  {message && <p className="form-message" role="alert">{message}</p>}
                  <button className="button button--dark submit-button" type="submit">Simpan rencana demo <span aria-hidden="true">↗</span></button>
                  <p className="privacy-note">Tidak ada pembayaran atau email yang dikirim. Data hanya di browser ini.</p>
                </form>
              </div>

              <aside className="summary" aria-label="Ringkasan pilihan"><p className="eyebrow">PILIHAN ANDA</p><div className="summary-art"><RoomArt id={spaceId} /></div><h3>{space.name}<span> / {space.number}</span></h3><p>{space.label}</p><div className="summary-rule" /><dl><div><dt>Tanggal</dt><dd>{formatDate(date)}</dd></div><div><dt>Waktu</dt><dd>{time ? `${time}–${String(Number(time.slice(0, 2)) + 2).padStart(2, '0')}:00` : 'Pilih slot'}</dd></div><div><dt>Kapasitas</dt><dd>Hingga {space.capacity} orang</dd></div></dl><div className="summary-features">{space.features.map(feature => <span key={feature}>{feature}</span>)}</div><div className="summary-price"><span>Tarif ilustratif / 2 jam</span><strong>{money(space.rate)}</strong></div><p className="summary-disclaimer">Harga dan ketersediaan hanya data contoh.</p></aside>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer"><div className="footer-top"><span className="footer-brand">sela<span>.</span></span><p>Ruang untuk ide yang bergerak.<br />Konsep UI oleh <a className="creator-link" href="https://indraarya.satuarah.click/" target="_blank" rel="noreferrer">Indra Arya Slamet Praditya</a>.</p><a href="https://github.com/indraaryaLabs/sela-booking-ui" target="_blank" rel="noreferrer">Lihat kode <span aria-hidden="true">↗</span></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SELA CONCEPT</span><span>DEMO INTERAKTIF · BUKAN LAYANAN NYATA</span></div></footer>
    </div>
  );
}
