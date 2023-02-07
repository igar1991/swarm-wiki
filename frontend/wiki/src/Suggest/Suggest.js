import {Autocomplete, TextField} from '@mui/material';
import {SearchClient} from '@bzzwiki/wiki-search';
import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';

export const SUGGEST_URL_KEY = 'suggest_url';

export default function Suggest() {
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestUrl, setSuggestUrl] = useState('');
  let searchClient = new SearchClient(suggestUrl);
  const navigate = useNavigate();

  const filterOptions = (options) => {
    return options
  };

  useEffect(() => {
    const url = localStorage.getItem(SUGGEST_URL_KEY);
    setSuggestUrl(url ? url : process.env.REACT_APP_SUGGEST_URL);
  }, []);

  useEffect(() => {
    if (suggestUrl) {
      searchClient = new SearchClient(suggestUrl);
    }
  }, [suggestUrl]);

  useEffect(() => {
    if (!inputValue) {
      return;
    }

    searchClient.suggest(process.env.REACT_APP_SUGGEST_DB_ID, inputValue).
        then(info => {
          const suggestions = info.result.map(item => {
            return {
              label: item.page.relativeUrl,
              title: item.page.relativeUrl,
            };
          });

          setSuggestions(suggestions);
        })
  }, [inputValue]);

  return (
      <>
        <Autocomplete
            filterOptions={filterOptions}
            options={suggestions}
            freeSolo
            onChange={(event, value) => {
              if (!value) {
                return;
              }

              navigate(`/wiki/en/${value.label}`);
            }}
            getOptionLabel={(option) => option.title ?? ''}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Search a page"
                    variant="outlined"
                    onChange={(event) => setInputValue(event.target.value)}
                />
            )}
        />

        <div className="d-flex flex-row-reverse bd-highlight">
          <div className="p-2 bd-highlight">
            <Link className="small" to="#" onClick={event => {
              event.preventDefault();
              const url = window.prompt('Specify suggest API url', suggestUrl);
              if (url) {
                // correct url here
                setSuggestUrl(url)
                localStorage.setItem(SUGGEST_URL_KEY, url)
              } else if (url === '') {
                // empty data, set to default
                setSuggestUrl(process.env.REACT_APP_SUGGEST_URL)
                localStorage.setItem(SUGGEST_URL_KEY, '')
              }
            }}>Change API url</Link>
          </div>
        </div>
      </>
  );
}