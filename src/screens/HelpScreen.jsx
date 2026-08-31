import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

const FAQ = [
  {
    q: 'How do I book a day?',
    a: [
      'Tap any day on the calendar. You can take the whole day, or just a time slot if you only need a few hours.',
      'If the day is free, that is it. It is yours straight away and nobody has to approve anything.',
    ],
  },
  {
    q: 'The day I want is already taken. Now what?',
    a: [
      'Ask that person first, in real life. The portal will not message them for you.',
      'Once they have agreed, tap the day and choose your time. You will be asked to confirm you have their permission, and to choose whether you are replacing their name or swapping one of your own days for it.',
      'Replacing means they give up that time and get nothing back. Swapping means they take one of your days in exchange.',
    ],
  },
  {
    q: 'Can two people share the same day?',
    a: [
      'Yes, as long as your times do not overlap. Book a slot instead of the whole day and you will both show on the calendar.',
      'If you book a slot in the middle of someone else\u2019s day, their time splits around yours. The calendar will show them before you, you, then them again.',
    ],
  },
  {
    q: 'What does the Towels badge mean?',
    a: [
      'Towel duty rotates. Two households have it one week, the other two have it the next, and so on.',
      'If it is your week, wash, dry, fold and put away a load of household towels on your laundry day, on top of your own laundry. You will also see a reminder at the top of the calendar.',
    ],
  },
  {
    q: 'Why does the calendar already have names on it?',
    a: [
      'There is a recurring schedule: Sundays are Malakai, Wednesdays are Scott + Starla, Thursdays are Alyssa + Josiah, and Saturdays are Matthew + Michael.',
      'Those are just defaults. Anyone can be moved off a day, and any day can be restored to the recurring schedule from the day controls.',
    ],
  },
  {
    q: 'How do I block a day?',
    a: [
      'Tap the day and switch on Block this day. Nobody can be scheduled while it is blocked.',
      'Unblocking leaves the day open rather than handing it back to whoever normally has it. Use Restore the recurring schedule if you want the usual name back.',
    ],
  },
  {
    q: 'I forgot my PIN.',
    a: [
      'On the sign-in screen, choose Reset PIN, enter your username, and set a new one. No admin has to be involved.',
      'The portal only holds a laundry schedule, so there is nothing sensitive behind your PIN.',
    ],
  },
  {
    q: 'Can I change how the app looks?',
    a: [
      'Yes. The gear icon opens Settings, with 27 themes plus text size, high contrast and reduced motion.',
      'Your choice is saved and stays put next time you sign in.',
    ],
  },
];

export default function HelpScreen() {
  const [open, setOpen] = useState(0);
  return (
    <div className="screen">
      <div className="page-head">
        <h1 className="page-title">Help</h1>
        <p className="page-sub">How the portal works, in plain terms.</p>
      </div>
      <div className="faq">
        {FAQ.map((item, i) => (
          <div className="faq__item" key={item.q}>
            <button
              type="button"
              className="faq__q"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <Icon name="chevronRight" size={15} className="faq__chev" />
              {item.q}
            </button>
            {open === i ? (
              <div className="faq__a">
                {item.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
