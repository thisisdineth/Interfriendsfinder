// badword.js

// Expanded list of bad words and sexual terms
const badWords = [
    // General profanities
    'fuck', 'shit', 'bitch', 'asshole', 'damn',
    'dick', 'pussy', 'cunt', 'bastard', 'whore',
    'slut', 'fag', 'nigger', 'kike', 'chink',
    'spic', 'gook', 'wop', 'freak', 'retard',
    'cocksucker', 'motherfucker', 'twat', 'prick',
    
    // Sexual and sexting-related terms
    'sex', 'sexy', 'horny', 'naked', 'fuck me', 
    'make love', 'suck', 'blowjob', 'cum', 'orgasm',
    'masturbate', 'pillow talk', 'handsome', 'beautiful',
    'kinky', 'dirty talk', 'strip', 'seduce', 'tease' , 'hutto' , 'huttho' , 'pako' , 'pakaya' , 'hukapan' , 'hutthige puthe' ,'kariya' , 'cariyo' , 'ponnaya' , 'http' , 'puka'
];

/**
 * Filters out bad words from the given message.
 * @param {string} message - The message to be filtered.
 * @returns {string} - The filtered message.
 */
export function filterBadWords(message) {
    // Create a regex pattern that allows matching bad words with spaces or non-word characters
    const pattern = new RegExp(
        `\\b(${badWords.map(word => word.split('').join('[\\s-]*')).join('|')})\\b`,
        'gi'
    );

    // Replace the bad words with asterisks, ignoring spaces
    return message.replace(pattern, (match) => '🚫'.repeat(match.replace(/\s+/g, '').length));
}


