from .app import Sfpt as App

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String

Base = declarative_base()


class Watershed(Base):
    """
    Watershed SQLAlchemy DB Model
    """
    __tablename__ = 'watersheds'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    subbasin = Column(String)
    geoserver = Column(String)
    drainage_name = Column(String)
    catchment_name = Column(String)


class GeoServer(Base):
    """
    GeoServer SQLAlchemy DB Model
    """
    __tablename__ = 'geoservers'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)
    username = Column(String)
    password = Column(String)


def init_sfpt_db(engine, first_time):
    """
    Initialize database for the App
    """
    # Create tables
    Base.metadata.create_all(engine)


def new_watershed(name, subbasin, geoserver, drainage_name, catchment_name):
    """
    Persist a new global watershed
    """
    # create a new record (instance of the Watershed Class)
    watershed = Watershed(
        name=name,
        subbasin=subbasin,
        geoserver=geoserver,
        drainage_name=drainage_name,
        catchment_name=catchment_name,
    )

    # Get connection/session to database
    session_maker = App.get_persistent_store_database('sfpt_db', as_sessionmaker=True)
    session = session_maker()

    # Add the new record, commit, close
    session.add(watershed)
    session.commit()
    session.close()

    return


def new_geoserver(id, name, url, username, password):
    """
    Persist a new global watershed
    """
    # create a new record (instance of the GeoServer Class)
    geoserver = GeoServer(
        id=id,
        name=name,
        url=url,
        username=username,
        password=password,
    )

    # Get connection/session to database
    session_maker = App.get_persistent_store_database('sfpt_db', as_sessionmaker=True)
    session = session_maker()

    # Add the new record, commit, close
    session.add(geoserver)
    session.commit()
    session.close()

    return


def get_watershedlist():
    """
    Query the database for all the Watersheds. Return list of tuples formatted for a tethys gizmo
    """
    # todo
    return


def get_geoserverlist():
    """
    Query the database for all the GeoServers. Return list of tuples formatted for a tethys gizmo
    """
    # todo
    return
