export default function decorate(block) {
  // Classes for bgcolor (style) and border style (borderStyle) are automatically
  // added to the block by the framework from the multiselect fields
  // Just clear the inner content since this is a spacer
  block.innerHTML = "";
}
