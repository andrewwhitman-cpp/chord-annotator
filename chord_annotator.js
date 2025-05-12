document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const saveBtn = document.getElementById('save-btn');
    const clearBtn = document.getElementById('clear-btn');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const chordPreview = document.getElementById('chord-preview');
    const removeChordBtn = document.getElementById('remove-chord-btn');
    const notationToggle = document.getElementById('notation-toggle');
    const chordRootButtons = document.querySelectorAll('.chord-root');
    const chordTypeButtons = document.querySelectorAll('.chord-type');
    const keySelector = document.getElementById('key-selector');
    let selectedSongKey = keySelector ? keySelector.value : 'C';
    
    // Enharmonic equivalents mapping for converting between notations
    const enharmonicMap = {
        'A#': 'Bb', 'Bb': 'A#',
        'C#': 'Db', 'Db': 'C#',
        'D#': 'Eb', 'Eb': 'D#',
        'F#': 'Gb', 'Gb': 'F#',
        'G#': 'Ab', 'Ab': 'G#'
    };
    
    // State variables
    let originalText = '';
    let selectedWord = null;
    let selectedChordRoot = '';
    let selectedChordType = '';
    let wordElements = [];
    let chordAnnotations = {}; // Format: {wordIndex: {root: 'A', type: 'm'}}
    let useSharps = false; // Default to flats notation
    
    // Initialize event listeners
    initEventListeners();
    updateNotationDisplay();
    
    // Select Major chord type by default on page load
    chordTypeButtons.forEach(btn => {
        if (btn.textContent === 'Major') {
            btn.classList.add('selected');
            selectedChordType = ''; // Major chord type is represented as an empty string
        }
    });
    
    function initEventListeners() {
        // File operations
        fileInput.addEventListener('change', handleFileUpload);
        saveBtn.addEventListener('click', saveAnnotatedLyrics);
        clearBtn.addEventListener('click', clearAnnotations);
        removeChordBtn.addEventListener('click', removeSelectedChord);
        if (keySelector) {
            keySelector.addEventListener('change', function() {
                selectedSongKey = this.value;
                // Automatically set notation toggle based on key categorization
                const sharpKeys = ['G','D','A','E','B'];
                const flatKeys = ['C','F','Bb','Eb','Ab','Db','Gb'];
                // Use the same mapping as in majorScales
                if (sharpKeys.includes(selectedSongKey)) {
                    useSharps = true;
                    notationToggle.checked = true;
                } else if (flatKeys.includes(selectedSongKey)) {
                    useSharps = false;
                    notationToggle.checked = false;
                }
                updateNotationDisplay();
                updateChordSelectionUI();
            });
        }
        
        // Notation toggle
        notationToggle.addEventListener('change', function() {
            useSharps = this.checked;
            updateNotationDisplay();
            updateChordSelectionUI(); // Update the chord selection UI if a chord is selected
        });
        
        // Chord selection
        chordRootButtons.forEach(button => {
            button.addEventListener('click', () => {
                selectChordRoot(button);
            });
        });
        
        chordTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                selectChordType(button);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ignore if typing in an input or textarea
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            const key = e.key.toLowerCase();
            const chordKeys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
            if (chordKeys.includes(key)) {
                chordRootButtons.forEach(btn => {
                    if (btn.textContent.toLowerCase() === key && btn.offsetParent !== null) {
                        btn.click();
                    }
                });
            }
            // Keyboard shortcuts for scale degrees 1-7
            if (/^[1-7]$/.test(e.key)) {
                const majorScales = {
                    sharps: {
                        // circle of fifths
                        'C': ['C','D','E','F','G','A','B'],
                        'G': ['G','A','B','C','D','E','F#'],
                        'D': ['D','E','F#','G','A','B','C#'],
                        'A': ['A','B','C#','D','E','F#','G#'],
                        'E': ['E','F#','G#','A','B','C#','D#'],
                        'B': ['B','C#','D#','E','F#','G#','A#'],
                    },
                    flats: {
                        // circle of fourths
                        'C': ['C','D','E','F','G','A','B'],
                        'F': ['F','G','A','Bb','C','D','E'],
                        'Bb': ['Bb','C','D','Eb','F','G','A'],
                        'Eb': ['Eb','F','G','Ab','Bb','C','D'],
                        'Ab': ['Ab','Bb','C','Db','Eb','F','G'],
                        'Db': ['Db','Eb','F','Gb','Ab','Bb','C'],
                        'Gb': ['Gb','Ab','Bb','B','Db','Eb','F']
                    }
                };
                let scale;
                if (useSharps) {
                    scale = majorScales.sharps[selectedSongKey] || majorScales.sharps['C'];
                } else {
                    scale = majorScales.flats[selectedSongKey] || majorScales.flats['C'];
                }
                const degree = parseInt(e.key, 10) - 1;
                const note = scale[degree];
                // Chord type mapping for scale degrees
                const degreeChordTypes = ['Major', 'm', 'm', 'Major', 'Major', 'm', 'dim'];
                const chordTypeText = degreeChordTypes[degree];
                if (note) {
                    // Select the chord root button
                    chordRootButtons.forEach(btn => {
                        if (btn.textContent === note && btn.offsetParent !== null) {
                            btn.click();
                        }
                    });
                    // Select the chord type button
                    chordTypeButtons.forEach(btn => {
                        if (btn.textContent === chordTypeText) {
                            btn.click();
                        }
                    });
                }
            }
        });
    }
    
    function updateNotationDisplay() {
        // Toggle body class to control CSS display of sharp/flat buttons
        if (useSharps) {
            document.body.classList.add('use-sharps');
        } else {
            document.body.classList.remove('use-sharps');
        }
    }
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            originalText = e.target.result;
            displayLyrics(originalText);
        };
        reader.readAsText(file);
    }
    
    function displayLyrics(text) {
        // Clear previous content
        lyricsDisplay.innerHTML = '';
        wordElements = [];
        chordAnnotations = {};
        
        // Split text by lines to preserve formatting
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            
            if (line.trim() === '') {
                // Empty line
                lineDiv.innerHTML = '&nbsp;';
                lyricsDisplay.appendChild(lineDiv);
                return;
            }
            
            // Split line into words
            const words = line.split(/\s+/);
            
            words.forEach((word, wordIndex) => {
                if (word === '') return;
                
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word;
                wordSpan.className = 'word';
                wordSpan.dataset.index = wordElements.length;
                
                wordSpan.addEventListener('click', () => {
                    selectWord(wordSpan);
                });
                
                wordElements.push(wordSpan);
                lineDiv.appendChild(wordSpan);
                lineDiv.appendChild(document.createTextNode(' ')); // Add space between words
            });
            
            lyricsDisplay.appendChild(lineDiv);
        });
    }
    
    function selectWord(wordElement) {
        // Deselect previous word
        if (selectedWord) {
            selectedWord.classList.remove('selected');
        }
        
        // Select new word
        wordElement.classList.add('selected');
        selectedWord = wordElement;
        
        // Check if word already has a chord
        const wordIndex = wordElement.dataset.index;
        if (chordAnnotations[wordIndex]) {
            // Word has a chord, show it in the preview
            const chord = chordAnnotations[wordIndex];
            selectedChordRoot = chord.root;
            selectedChordType = chord.type;
            
            // Update UI to reflect the selected chord
            updateChordSelectionUI();
        } else {
            // Reset chord selection
            resetChordSelection();
        }
    }
    
    function selectChordRoot(button) {
        // Deselect previous chord root
        chordRootButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Select new chord root
        button.classList.add('selected');
        selectedChordRoot = button.textContent;
        
        // If this is an enharmonic note (has a sharp/flat equivalent), store it in the current notation
        if (enharmonicMap[selectedChordRoot]) {
            // Store the chord in the current notation preference
            selectedChordRoot = useSharps ? 
                (selectedChordRoot.includes('#') ? selectedChordRoot : enharmonicMap[selectedChordRoot]) :
                (selectedChordRoot.includes('b') ? selectedChordRoot : enharmonicMap[selectedChordRoot]);
        }
        
        // Automatically select Major chord type if no chord type is currently selected
        if (!selectedChordType) {
            // Find and select the Major chord type button
            chordTypeButtons.forEach(btn => {
                if (btn.textContent === 'Major') {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            selectedChordType = ''; // Major chord type is represented as an empty string
        }
        
        updateChordPreview();
        applyChordToSelectedWord();
    }
    
    function selectChordType(button) {
        // Deselect previous chord type
        chordTypeButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Select new chord type
        button.classList.add('selected');
        selectedChordType = button.textContent === 'Major' ? '' : button.textContent;
        
        updateChordPreview();
        applyChordToSelectedWord();
    }
    
    function updateChordPreview() {
        if (selectedChordRoot) {
            // Convert the chord root to the current notation preference if needed
            let displayRoot = selectedChordRoot;
            if (enharmonicMap[displayRoot]) {
                // If the current root doesn't match the current notation preference, convert it
                const hasSharp = displayRoot.includes('#');
                const hasFlat = displayRoot.includes('b');
                
                if ((useSharps && hasFlat) || (!useSharps && hasSharp)) {
                    displayRoot = enharmonicMap[displayRoot];
                }
            }
            
            chordPreview.textContent = `${displayRoot}${selectedChordType}`;
        } else {
            chordPreview.textContent = 'No chord selected';
        }
    }
    
    function updateChordSelectionUI() {
        // Update chord root buttons
        chordRootButtons.forEach(btn => {
            // For regular notes (no enharmonic equivalent)
            if (!enharmonicMap[btn.textContent]) {
                btn.classList.toggle('selected', btn.textContent === selectedChordRoot);
            } 
            // For enharmonic notes, check if the current button matches the selected root
            // or if its enharmonic equivalent matches and we're in the wrong notation mode
            else {
                const isEnharmonicEquivalent = enharmonicMap[btn.textContent] === selectedChordRoot;
                const isDirectMatch = btn.textContent === selectedChordRoot;
                
                // Select if direct match or if it's the equivalent in the current notation
                if (isDirectMatch || (isEnharmonicEquivalent && 
                    ((useSharps && btn.textContent.includes('#')) || 
                     (!useSharps && btn.textContent.includes('b'))))) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            }
        });
        
        // Update chord type buttons
        chordTypeButtons.forEach(btn => {
            const btnType = btn.textContent === 'Major' ? '' : btn.textContent;
            btn.classList.toggle('selected', btnType === selectedChordType);
        });
        
        updateChordPreview();
    }
    
    function applyChordToSelectedWord() {
        if (!selectedWord || !selectedChordRoot) return;
        const wordIndex = selectedWord.dataset.index;
        // Store chord annotation
        chordAnnotations[wordIndex] = {
            root: selectedChordRoot,
            type: selectedChordType
        };
        // Update word appearance
        selectedWord.classList.add('has-chord');
        selectedWord.title = `${selectedChordRoot}${selectedChordType}`;
        // Update the word's innerHTML to show the prepended chord
        let displayRoot = selectedChordRoot;
        if (enharmonicMap[displayRoot]) {
            const hasSharp = displayRoot.includes('#');
            const hasFlat = displayRoot.includes('b');
            if ((useSharps && hasFlat) || (!useSharps && hasSharp)) {
                displayRoot = enharmonicMap[displayRoot];
            }
        }
        selectedWord.innerHTML = `[${displayRoot}${selectedChordType}]` + selectedWord.textContent.replace(/^\[[^\]]+\]/, '');
    }
    
    function removeSelectedChord() {
        if (!selectedWord) return;
        const wordIndex = selectedWord.dataset.index;
        // Remove chord annotation
        delete chordAnnotations[wordIndex];
        // Update word appearance
        selectedWord.classList.remove('has-chord');
        selectedWord.title = '';
        // Remove the prepended chord from innerHTML
        selectedWord.innerHTML = selectedWord.textContent.replace(/^\[[^\]]+\]/, '');
        // Reset chord selection
        resetChordSelection();
    }
    
    function resetChordSelection() {
        selectedChordRoot = '';
        selectedChordType = '';
        
        // Deselect all chord buttons
        chordRootButtons.forEach(btn => btn.classList.remove('selected'));
        
        // Select Major chord type by default
        chordTypeButtons.forEach(btn => {
            if (btn.textContent === 'Major') {
                btn.classList.add('selected');
                selectedChordType = ''; // Major chord type is represented as an empty string
            } else {
                btn.classList.remove('selected');
            }
        });
        
        updateChordPreview();
    }
    
    function clearAnnotations() {
        // Clear all chord annotations
        chordAnnotations = {};
        // Reset word appearances
        wordElements.forEach(wordElement => {
            wordElement.classList.remove('has-chord');
            wordElement.title = '';
            // Remove the prepended chord from innerHTML
            wordElement.innerHTML = wordElement.textContent.replace(/^\[[^\]]+\]/, '');
        });
        // Reset chord selection
        resetChordSelection();
        // Deselect word
        if (selectedWord) {
            selectedWord.classList.remove('selected');
            selectedWord = null;
        }
    }
    
    function saveAnnotatedLyrics() {
        if (!originalText) {
            alert('Please load a lyrics file first.');
            return;
        }
        // Create annotated text
        let annotatedText = '';
        const lines = originalText.split('\n');
        let wordCounter = 0;
        lines.forEach(line => {
            if (line.trim() === '') {
                annotatedText += '\n';
                return;
            }
            let annotatedLine = '';
            const words = line.split(/\s+/);
            words.forEach(word => {
                if (word === '') return;
                const chord = chordAnnotations[wordCounter];
                if (chord) {
                    let displayRoot = chord.root;
                    if (enharmonicMap[displayRoot]) {
                        const hasSharp = displayRoot.includes('#');
                        const hasFlat = displayRoot.includes('b');
                        if ((useSharps && hasFlat) || (!useSharps && hasSharp)) {
                            displayRoot = enharmonicMap[displayRoot];
                        }
                    }
                    annotatedLine += `[${displayRoot}${chord.type}]${word} `;
                } else {
                    annotatedLine += `${word} `;
                }
                wordCounter++;
            });
            annotatedText += annotatedLine.trim() + '\n';
        });
        // Add song key info at the top
        annotatedText = `Song Key: ${selectedSongKey}\n` + annotatedText;
        // Create download link
        const blob = new Blob([annotatedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        let filename = 'lyrics-chords.txt';
        if (fileInput.files[0]) {
            const originalFilename = fileInput.files[0].name;
            const filenameParts = originalFilename.split('.');
            const extension = filenameParts.pop();
            const baseName = filenameParts.join('.');
            filename = `${baseName}-chords.${extension}`;
        }
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
});