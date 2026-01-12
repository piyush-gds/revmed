
export default function decorate(block) {
  // Collect all <p> text inside the block
  const texts = Array.from(block.querySelectorAll('p')).map(p => p.textContent.trim());

  // Combine into one string
  const combinedText = texts.join(' '); // e.g., "Hello, I'm POC Block Item 1"

  // Clear existing content
  block.textContent = '';

  // Create a new single div
  const newDiv = document.createElement('div');
  newDiv.className = 'poc-button-container'; // your desired class
  newDiv.textContent = combinedText;

  // Append to block
  block.appendChild(newDiv);
}