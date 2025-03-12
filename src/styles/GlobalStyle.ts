// src/styles/GlobalStyle.ts
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`

  body {
    margin: 0px;
  }

  td {
    min-width: 50px;
  }

  .ace-cloud_editor {
    max-height: 450px;
    overflow: auto;
  }

  .ace-cloud_editor {
    background-color: #97979724 !important; 
  }

  .ace-cloud_editor>div>table>tbody>tr>td {
    background-color: #97979724 !important;
  }

  footer {
    color: white !important;
    min-height: 50px;
    padding: 10px;

    align-items: center;
    background-color: #0f1b2a !important;
    bottom: 0;
    display: flex
    font-family: var(--font-family-base-dnvic8, "Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif);
    font-size: 14px;
    gap: 10px;
    justify-content: space-between;
    inset-inline-start: 0;
    margin: 0;
    min-block-size: 40px;
    padding-block: 10px;
    padding-inline: 40px;
    position: fixed;
    inset-inline-end: 0;
    inset-block-end: 0;
    z-index: 2000;
  }

  footer div {
    background-color: #151d27;
    color: white !important;
  }

  footer a {
    color: #2bb7bb !important;
  }

  #top-navigation-panel {
    display: block;
    position: fixed;
    inset-block-start: 0;
    inset-inline-start: 0;
    inset-inline-end: 0;
    z-index: 1000;
    margin: 0;
    background-color: #0f1b2a;
    font-family: var(--font-family-base-dnvic8, "Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif);
    border-block-end: solid 1px #414d5c;
}
`;
