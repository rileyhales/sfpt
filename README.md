# Streamflow Prediction Tool

A tool for predicting streamflow in every stream in the world based on a GIS watershed delineation of [MERIT DEM](http://hydro.iis.u-tokyo.ac.jp/~yamadai/MERIT_DEM/) data, [ECMWF gridded runoff](https://www.ecmwf.int/en/forecasts) predictions, the [RAPID routing method](http://rapid-hub.org/), and the [ERA-Interim](https://www.ecmwf.int/en/forecasts/datasets/reanalysis-datasets/era-interim) historical data.

This tool is built by Riley Hales and is based on the work of Michael Suffront and is inspired by and updates the original application by Alan Snow.

## Notes on the SFPT Workflow (Azure)

~~~~
globalfloods-linux-vm
home/byuhi
---> scripts/
	# Shell scripts
	Export_forecast_workflow.sh (the shell script that runs the full sfp workflow)

	# Python files
	spt_extract_plain_tables.py
	....

---> rapid-io/
	---> output/
	    ---> watershed_region_name/
	        ---> ForecastDate in format YYYMMDD.HH (eg 20190525.00)/
	            
	            (52 files, forecasted flow in each stream, each timestep, each ensemble)
	            ---> Qout_region_name_ensemble#.nc
	            
	            Stats computed as part of the workflow (rather than on the fly)
	            ---> nces_max.nc
	            ---> nces_min.nc
	            ---> nces_average.nc
	            
	            These are computed ?????? each day as part of the forecasting workflow?
	            ---> returnperiod_2.geojson
	            ---> returnperiod_10.geojson
	            ---> returnperiod_20.geojson

--->era_interim/

~~~~